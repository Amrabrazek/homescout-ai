import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { TypesenseService } from '../common/typesense/typesense.service';
import { UnitSyncQueue } from '../modules/sync/unit-sync.queue';
import {
  EMBEDDING_PROVIDER,
  EmbeddingProvider,
} from '../modules/embedding/embedding.provider';

// Enqueue only; the API's worker (or a running one) does the embedding and indexing.
process.env.WORKER = 'false';

/**
 * Enqueues a sync job for every unit, plus every search document whose unit is
 * gone, so the worker re-embeds (when the text changed) and rebuilds the index.
 * `--if-needed` skips when embeddings and the index already match the database.
 */
async function main() {
  const logger = new Logger('Reindex');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const typesense = app.get(TypesenseService);
    const queue = app.get(UnitSyncQueue);
    const { model } = app.get<EmbeddingProvider>(EMBEDDING_PROVIDER);

    const unitIds: string[] = (
      await dataSource.query('SELECT id FROM units')
    ).map((r) => r.id);

    let indexedIds: string[] = [];
    try {
      await typesense.ensureCollection();
      indexedIds = await typesense.listDocumentIds();
    } catch (error) {
      logger.warn(
        `Typesense unavailable (${error.message}); jobs will retry until it is up`
      );
    }

    if (process.argv.includes('--if-needed')) {
      const [{ missing }] = await dataSource.query(
        `SELECT COUNT(*)::int AS missing FROM units u
         WHERE NOT EXISTS (
           SELECT 1 FROM unit_embeddings e WHERE e.unit_id = u.id AND e.model = $1
         )`,
        [model]
      );
      const indexed = new Set(indexedIds);
      const inSync =
        missing === 0 &&
        indexed.size === unitIds.length &&
        unitIds.every((id) => indexed.has(id));
      if (inSync) {
        logger.log(
          `${unitIds.length} units already embedded (${model}) and indexed, skipping`
        );
        return;
      }
    }

    const ids = [...new Set([...unitIds, ...indexedIds])];
    for (let start = 0; start < ids.length; start += 1000) {
      await queue.enqueue(ids.slice(start, start + 1000));
    }
    logger.log(
      `Enqueued ${ids.length} unit(s) for ${model}; the worker embeds and indexes them`
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
