import { DataSource } from 'typeorm';
import { Unit } from '../common/entities/unit.entity';
import { EmbeddingProvider } from '../modules/embedding/embedding.provider';
import {
  LocationVocabulary,
  parseSearchQuery,
} from '../modules/search/query-parser';
import { compileUnitFilter } from '../modules/search/unit-filter';
import { UnitFilterInput } from '../modules/unit/dto/unit-filter.input';
import { EvalUnit } from './eval-unit';
import { SEMANTIC_QUERIES } from './fixtures/personas';
import { mean, percentile, precisionAtK } from './metrics';

const K = 10;

export interface RetrievalQueryResult {
  query: string;
  /** What the parser left for the vector search. */
  text: string;
  relevantLabel: string;
  poolSize: number;
  /** Share of the filtered pool that is relevant: what a random order scores. */
  baseRate: number | null;
  precision: Record<string, number | null>;
}

export interface RetrievalEvalResult {
  k: number;
  models: string[];
  queries: RetrievalQueryResult[];
  summary: Record<
    string,
    {
      meanPrecision: number | null;
      queryLatencyMs: { p50: number | null; p95: number | null };
    }
  >;
  meanBaseRate: number | null;
}

/**
 * Ranks each query's filtered pool by one model's vectors at a time, straight
 * from unit_embeddings. Typesense's keyword half is left out on purpose: it is
 * the same for every model, and only the vector half changes between them.
 */
export async function runRetrievalEval(
  dataSource: DataSource,
  units: Map<string, EvalUnit>,
  vocabulary: LocationVocabulary,
  providers: EmbeddingProvider[]
): Promise<RetrievalEvalResult> {
  const latencies = new Map(providers.map((p) => [p.model, [] as number[]]));
  const queries: RetrievalQueryResult[] = [];

  for (const { query, relevant } of SEMANTIC_QUERIES) {
    const parsed = parseSearchQuery(query, vocabulary);
    const pool = await poolIds(dataSource, parsed.filter);
    const isRelevant = (id: string) => {
      const unit = units.get(id);
      return !!unit && relevant.matches(unit);
    };
    const result: RetrievalQueryResult = {
      query,
      text: parsed.text,
      relevantLabel: relevant.label,
      poolSize: pool.length,
      baseRate: pool.length
        ? pool.filter(isRelevant).length / pool.length
        : null,
      precision: {},
    };

    for (const provider of providers) {
      const started = performance.now();
      const vector = await provider.embedQuery(parsed.text || query);
      latencies.get(provider.model).push(performance.now() - started);
      const ranked = await rankPool(
        dataSource,
        parsed.filter,
        provider.model,
        vector
      );
      result.precision[provider.model] = precisionAtK(ranked, isRelevant, K);
    }
    queries.push(result);
  }

  const summary: RetrievalEvalResult['summary'] = {};
  for (const provider of providers) {
    const times = latencies.get(provider.model);
    summary[provider.model] = {
      meanPrecision: mean(
        queries
          .map((q) => q.precision[provider.model])
          .filter((p): p is number => p != null)
      ),
      queryLatencyMs: {
        p50: percentile(times, 50),
        p95: percentile(times, 95),
      },
    };
  }

  return {
    k: K,
    models: providers.map((p) => p.model),
    queries,
    summary,
    meanBaseRate: mean(
      queries.map((q) => q.baseRate).filter((r): r is number => r != null)
    ),
  };
}

function poolQuery(dataSource: DataSource, filter: UnitFilterInput) {
  const { where, params } = compileUnitFilter(filter).sql;
  return dataSource
    .createQueryBuilder()
    .from(Unit, 'unit')
    .innerJoin('unit.project', 'project')
    .select('unit.id', 'id')
    .where(where, params);
}

async function poolIds(
  dataSource: DataSource,
  filter: UnitFilterInput
): Promise<string[]> {
  const rows = await poolQuery(dataSource, filter).getRawMany();
  return rows.map((r) => r.id);
}

async function rankPool(
  dataSource: DataSource,
  filter: UnitFilterInput,
  model: string,
  vector: number[]
): Promise<string[]> {
  const rows = await poolQuery(dataSource, filter)
    .innerJoin(
      'unit_embeddings',
      'e',
      'e.unit_id = unit.id AND e.model = :model',
      { model }
    )
    .orderBy('e.embedding <=> CAST(:vector AS vector)', 'ASC')
    .setParameter('vector', `[${vector.join(',')}]`)
    .limit(K)
    .getRawMany();
  return rows.map((r) => r.id);
}
