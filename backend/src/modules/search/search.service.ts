import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  TypesenseService,
  UnitDocument,
} from '../../common/typesense/typesense.service';
import {
  EMBEDDING_MODELS,
  EMBEDDING_PROVIDER,
  EmbeddingProvider,
} from '../embedding/embedding.provider';
import { UnitFilterInput } from '../unit/dto/unit-filter.input';
import {
  SortDirection,
  UnitSortField,
  UnitSortInput,
} from '../unit/dto/unit-sort.input';
import { LlmQueryParser, PARSED_GROUPS } from './llm-query-parser';
import { LocationVocabulary, parseSearchQuery } from './query-parser';
import {
  FacetCountResponse,
  SearchUnitDocument,
  SearchUnitsResponse,
} from './search.model';
import { compileUnitFilter } from './unit-filter';

export interface UnitSearchRequest {
  filter?: UnitFilterInput;
  sort?: UnitSortInput;
  limit?: number;
  offset?: number;
  facets?: boolean;
}

const QUERY_BY =
  'name,projectName,area,city,developerName,amenityNames,description,number';
const FACET_BY =
  'projectId,rooms,floor,price,floorArea,amenityNames,amenityIds,projectName,developerName,area,city,region,propertyType,finishing';
const VOCABULARY_TTL_MS = 5 * 60_000;

/**
 * The one search entry point: free text is parsed into hard filters (rooms,
 * price, property type, location; regex first, then an LLM for leftovers); what remains goes to Typesense as a hybrid query, keyword
 * (typo-tolerant) fused with a vector query from the active EmbeddingProvider.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private vocabulary?: { value: Promise<LocationVocabulary>; at: number };

  constructor(
    private readonly typesense: TypesenseService,
    private readonly dataSource: DataSource,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: EmbeddingProvider,
    private readonly llmParser: LlmQueryParser
  ) {}

  async search(request: UnitSearchRequest): Promise<SearchUnitsResponse> {
    const limit = request.limit ?? 20;
    const offset = request.offset ?? 0;
    const { text, filter } = await this.understand(request.filter);

    const params: Record<string, unknown> = {
      q: text || '*',
      query_by: QUERY_BY,
      filter_by: compileUnitFilter(filter).typesense,
      per_page: limit,
      page: limit > 0 ? Math.floor(offset / limit) + 1 : 1,
      exclude_fields: 'embedding',
    };
    if (request.facets) params.facet_by = FACET_BY;

    const sortBy = this.sortBy(request.sort, !!text);
    if (sortBy) params.sort_by = sortBy;

    const vector = text ? await this.embedQuery(text) : undefined;
    if (vector) {
      const k = Math.max(100, offset + limit);
      const { maxDistance } = EMBEDDING_MODELS[this.embeddings.model];
      params.vector_query = `embedding:([${vector.join(',')}], k: ${k}, distance_threshold: ${maxDistance})`;
    }

    const result = await this.typesense.search(params);
    return {
      items: (result.hits ?? []).map((hit) => toSearchDocument(hit.document)),
      total: result.found ?? 0,
      facets: result.facet_counts ?? [],
    };
  }

  async getFacetCounts(filter?: UnitFilterInput): Promise<FacetCountResponse> {
    const { facets, total } = await this.search({
      filter,
      limit: 0,
      facets: true,
    });
    return { facets, total };
  }

  /**
   * Turns searchTerm into hard filters plus leftover text. Explicit filters win
   * over parsed ones, and parsed groups the buyer removed (`ignoreParsed`) are
   * dropped. `guessed` names the groups the LLM set rather than the regex.
   */
  async understand(
    filter: UnitFilterInput = {}
  ): Promise<{ text: string; filter: UnitFilterInput; guessed: string[] }> {
    const { searchTerm, ignoreParsed, ...explicit } = filter;
    if (!searchTerm?.trim()) return { text: '', filter: explicit, guessed: [] };

    const vocabulary = await this.locations();
    const regex = parseSearchQuery(searchTerm, vocabulary);
    const parsed = await this.llmParser.refine(searchTerm, regex, vocabulary);
    const guessed = Object.keys(PARSED_GROUPS).filter((group) =>
      PARSED_GROUPS[group].some(
        (key) =>
          JSON.stringify(parsed.filter[key]) !==
          JSON.stringify(regex.filter[key])
      )
    );
    const merged: UnitFilterInput = { ...parsed.filter };
    for (const group of ignoreParsed ?? [])
      for (const key of PARSED_GROUPS[group] ?? []) delete merged[key];
    for (const [key, value] of Object.entries(explicit)) {
      if (value != null && !(Array.isArray(value) && value.length === 0))
        merged[key] = value;
    }
    return {
      text: parsed.text,
      filter: merged,
      guessed: guessed.filter((group) => !ignoreParsed?.includes(group)),
    };
  }

  /** The buyer removed an LLM guess for this search: stop serving it from the cache. */
  async rejectGuess(searchTerm: string): Promise<void> {
    if (!searchTerm.trim()) return;
    const vocabulary = await this.locations();
    await this.llmParser.evict(
      searchTerm,
      parseSearchQuery(searchTerm, vocabulary)
    );
  }

  private sortBy(
    sort: UnitSortInput | undefined,
    hasText: boolean
  ): string | undefined {
    const fields: Partial<Record<UnitSortField, string>> = {
      [UnitSortField.NAME]: 'name',
      [UnitSortField.PRICE]: 'price',
      [UnitSortField.CREATED_AT]: 'createdAt',
    };
    const field = fields[sort?.field];
    if (!field) return hasText ? undefined : 'createdAt:desc';
    const direction =
      sort.direction ??
      (field === 'createdAt' ? SortDirection.DESC : SortDirection.ASC);
    return `${field}:${direction.toLowerCase()}`;
  }

  private async embedQuery(text: string): Promise<number[] | undefined> {
    try {
      return await this.embeddings.embedQuery(text);
    } catch (error) {
      this.logger.warn(
        `Query embedding failed, using keyword search only: ${error.message}`
      );
      return undefined;
    }
  }

  private locations(): Promise<LocationVocabulary> {
    if (
      !this.vocabulary ||
      Date.now() - this.vocabulary.at > VOCABULARY_TTL_MS
    ) {
      const value = loadLocationVocabulary(this.dataSource);
      value.catch(() => (this.vocabulary = undefined));
      this.vocabulary = { value, at: Date.now() };
    }
    return this.vocabulary.value;
  }
}

/** Every place and amenity name in the data, for the search parsers. */
export async function loadLocationVocabulary(
  dataSource: DataSource
): Promise<LocationVocabulary> {
  const [row] = await dataSource.query(
    `SELECT array_agg(DISTINCT area) FILTER (WHERE area IS NOT NULL) AS areas,
            array_agg(DISTINCT city) FILTER (WHERE city IS NOT NULL) AS cities,
            array_agg(DISTINCT region) FILTER (WHERE region IS NOT NULL) AS regions
     FROM projects`
  );
  const amenities: { name: string }[] = await dataSource.query(
    `SELECT name FROM amenities ORDER BY name`
  );
  return {
    areas: row?.areas ?? [],
    cities: row?.cities ?? [],
    regions: row?.regions ?? [],
    amenities: amenities.map((a) => a.name),
  };
}

function toSearchDocument(doc: UnitDocument): SearchUnitDocument {
  return {
    id: doc.id,
    name: doc.name,
    number: doc.number,
    description: doc.description,
    floor: doc.floor,
    rooms: doc.rooms,
    bathrooms: doc.bathrooms,
    floorArea: doc.floorArea,
    price: doc.price,
    propertyType: doc.propertyType as SearchUnitDocument['propertyType'],
    finishing: doc.finishing as SearchUnitDocument['finishing'],
    view: doc.view as SearchUnitDocument['view'],
    deliveryYear: doc.deliveryYear,
    createdAt: new Date(doc.createdAt),
    project: {
      id: doc.projectId,
      name: doc.projectName,
      area: doc.area,
      city: doc.city,
      region: doc.region,
      developer: { name: doc.developerName },
    },
    amenities: (doc.amenityIds ?? []).map((id, i) => ({
      id,
      name: doc.amenityNames?.[i] ?? '',
    })),
    images: (doc.imageUrls ?? []).map((url) => ({ url })),
  };
}
