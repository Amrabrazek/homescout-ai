import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { Unit } from '../common/entities/unit.entity';
import { runFeedEval } from '../evals/feed.eval';
import { loadEvalUnits } from '../evals/eval-unit';
import { runParseEval } from '../evals/parse.eval';
import { renderSearchReport } from '../evals/report';
import { runRetrievalEval } from '../evals/retrieval.eval';
import { runSimilarEval } from '../evals/similar.eval';
import { BuyerService } from '../modules/buyer/buyer.service';
import {
  EMBEDDING_MODELS,
  EMBEDDING_PROVIDER,
  EmbeddingModel,
  EmbeddingProvider,
} from '../modules/embedding/embedding.provider';
import { LocalE5Provider } from '../modules/embedding/local-e5.provider';
import { OpenAIEmbeddingProvider } from '../modules/embedding/openai.provider';
import { FeedService } from '../modules/feed/feed.service';
import { UnitService } from '../modules/unit/unit.service';
import { LlmQueryParser } from '../modules/search/llm-query-parser';
import { createSearchLlm } from '../modules/search/search-llm';
import { loadLocationVocabulary } from '../modules/search/search.service';
import { refreshUnitEmbeddings } from '../modules/sync/unit-sync.service';

process.env.WORKER = 'false';

const REPORT = resolve(__dirname, '../../../docs/evals/search.md');

/**
 * Search evals: query parsing (regex vs + LLM), semantic ranking per embedding
 * model, the "For you" feed per persona and similar units. Embeds any units a model is
 * missing first, so a fresh database needs no manual step. Writes
 * docs/evals/search.md.
 */
async function main() {
  const logger = {
    log: (message: string) => console.log(message),
    warn: (message: string) => console.warn(message),
  };
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);
    const config = app.get(ConfigService);
    const active = app.get<EmbeddingProvider>(EMBEDDING_PROVIDER);

    const providers: EmbeddingProvider[] = [];
    const skippedModels: { model: string; reason: string }[] = [];
    for (const model of Object.keys(EMBEDDING_MODELS) as EmbeddingModel[]) {
      const provider = await usableProvider(model, active, config);
      if ('reason' in provider) {
        logger.warn(`Skipping ${model}: ${provider.reason}`);
        skippedModels.push({ model, reason: provider.reason });
      } else {
        providers.push(provider);
      }
    }

    const units = await dataSource.getRepository(Unit).find({
      relations: ['project', 'project.developer', 'amenities'],
    });
    for (const provider of providers) {
      logger.log(
        `Checking ${provider.model} embeddings for ${units.length} units`
      );
      const embedded = await refreshUnitEmbeddings(dataSource, provider, units);
      if (embedded)
        logger.log(`Embedded ${embedded} unit(s) with ${provider.model}`);
    }

    const vocabulary = await loadLocationVocabulary(dataSource);
    const evalUnits = await loadEvalUnits(dataSource);

    logger.log('Running query parsing eval');
    const searchLlm = createSearchLlm(
      new ConfigService({ ...process.env, SEARCH_LLM_ENABLED: 'true' })
    );
    const parse = await runParseEval(
      vocabulary,
      searchLlm
        ? {
            parser: new LlmQueryParser(searchLlm, Number.MAX_SAFE_INTEGER),
            model: searchLlm.model,
          }
        : { skipped: 'no API key for LLM_PROVIDER' }
    );

    logger.log('Running semantic ranking eval');
    const retrieval = await runRetrievalEval(
      dataSource,
      evalUnits,
      vocabulary,
      providers
    );

    logger.log(`Running "For you" eval with ${active.model}`);
    const feed = await runFeedEval(
      app.get(FeedService),
      app.get(BuyerService),
      evalUnits,
      active.model
    );

    logger.log(`Running similar units eval with ${active.model}`);
    const similar = await runSimilarEval(
      app.get(UnitService),
      evalUnits,
      active.model,
      providers.some((p) => p.model === active.model)
    );

    const markdown = renderSearchReport({
      generatedAt: new Date(),
      units: evalUnits.size,
      parse,
      retrieval,
      skippedModels,
      feed,
      similar,
    });
    mkdirSync(resolve(REPORT, '..'), { recursive: true });
    writeFileSync(REPORT, markdown);
    logger.log(`Wrote ${REPORT}`);
  } finally {
    await app.close();
  }
}

/** The provider for a model if it can embed right now, else why not. */
async function usableProvider(
  model: EmbeddingModel,
  active: EmbeddingProvider,
  config: ConfigService
): Promise<EmbeddingProvider | { reason: string }> {
  let provider: EmbeddingProvider;
  if (model === active.model) provider = active;
  else if (model === 'local-e5-small')
    provider = new LocalE5Provider(config.get<string>('EMBEDDING_CACHE_DIR'));
  else if (!config.get<string>('OPENAI_API_KEY'))
    return { reason: 'no OPENAI_API_KEY' };
  else
    provider = new OpenAIEmbeddingProvider(
      config.get<string>('OPENAI_API_KEY')
    );

  try {
    await provider.embedQuery('probe');
    return provider;
  } catch (error) {
    return { reason: `model unavailable (${error.message})` };
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
