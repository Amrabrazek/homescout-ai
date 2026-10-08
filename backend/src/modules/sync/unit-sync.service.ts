import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Unit } from '../../common/entities/unit.entity';
import {
  TypesenseService,
  toUnitDocument,
} from '../../common/typesense/typesense.service';
import {
  EMBEDDING_PROVIDER,
  EmbeddingProvider,
} from '../embedding/embedding.provider';
import {
  buildUnitEmbeddingText,
  contentHash,
} from '../embedding/unit-embedding-text';

export interface SyncResult {
  indexed: number;
  embedded: number;
  deleted: number;
}

/**
 * Brings units in line with the database: re-embeds a unit only when its
 * embedding text changed, then upserts it in (or deletes it from) Typesense.
 * Idempotent, so a retried or duplicated job is harmless.
 */
@Injectable()
export class UnitSyncService {
  private readonly logger = new Logger(UnitSyncService.name);

  constructor(
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    private readonly dataSource: DataSource,
    private readonly typesense: TypesenseService,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: EmbeddingProvider
  ) {}

  async syncUnits(unitIds: string[]): Promise<SyncResult> {
    const ids = [...new Set(unitIds)];
    const units = await this.units.find({
      where: { id: In(ids) },
      relations: ['project', 'project.developer', 'amenities'],
    });
    const existing = new Set(units.map((u) => u.id));
    const deletedIds = ids.filter((id) => !existing.has(id));

    const embedded = await this.refreshEmbeddings(units);
    const vectors = await this.loadEmbeddings(units.map((u) => u.id));
    const images = await this.loadImageUrls(units.map((u) => u.id));

    await this.typesense.upsertDocuments(
      units.map((u) =>
        toUnitDocument(u, images.get(u.id) ?? [], vectors.get(u.id))
      )
    );
    await this.typesense.deleteDocuments(deletedIds);

    return { indexed: units.length, embedded, deleted: deletedIds.length };
  }

  private async refreshEmbeddings(units: Unit[]): Promise<number> {
    if (units.length === 0) return 0;
    const model = this.embeddings.model;
    const rows: { unit_id: string; content_hash: string }[] =
      await this.dataSource.query(
        `SELECT unit_id, content_hash FROM unit_embeddings
         WHERE model = $1 AND unit_id = ANY($2::uuid[])`,
        [model, units.map((u) => u.id)]
      );
    const stored = new Map(rows.map((r) => [r.unit_id, r.content_hash]));

    const stale = units
      .map((unit) => {
        const text = buildUnitEmbeddingText(unit);
        return { unit, text, hash: contentHash(text) };
      })
      .filter(({ unit, hash }) => stored.get(unit.id) !== hash);
    if (stale.length === 0) return 0;

    const vectors = await this.embeddings.embedDocuments(
      stale.map((s) => s.text)
    );
    for (const vector of vectors) {
      if (vector.length !== this.embeddings.dimensions) {
        throw new Error(
          `${model} returned ${vector.length} dims, expected ${this.embeddings.dimensions}`
        );
      }
    }

    await this.dataSource.query(
      `INSERT INTO unit_embeddings (unit_id, model, embedding, content_hash)
       SELECT u.id, $1, u.embedding::vector, u.hash
       FROM unnest($2::uuid[], $3::text[], $4::text[]) AS u(id, embedding, hash)
       ON CONFLICT (unit_id, model) DO UPDATE
         SET embedding = EXCLUDED.embedding,
             content_hash = EXCLUDED.content_hash,
             updated_at = NOW()`,
      [
        model,
        stale.map((s) => s.unit.id),
        vectors.map((v) => `[${v.join(',')}]`),
        stale.map((s) => s.hash),
      ]
    );
    this.logger.log(`Embedded ${stale.length} unit(s) with ${model}`);
    return stale.length;
  }

  private async loadEmbeddings(ids: string[]): Promise<Map<string, number[]>> {
    if (ids.length === 0) return new Map();
    const rows: { unit_id: string; embedding: string }[] =
      await this.dataSource.query(
        `SELECT unit_id, embedding::text AS embedding FROM unit_embeddings
         WHERE model = $1 AND unit_id = ANY($2::uuid[])`,
        [this.embeddings.model, ids]
      );
    return new Map(rows.map((r) => [r.unit_id, JSON.parse(r.embedding)]));
  }

  private async loadImageUrls(ids: string[]): Promise<Map<string, string[]>> {
    if (ids.length === 0) return new Map();
    const rows: { unit_id: string; url: string }[] =
      await this.dataSource.query(
        `SELECT ui.unit_id, i.url FROM unit_images ui
       JOIN images i ON i.id = ui.image_id
       WHERE ui.unit_id = ANY($1::uuid[])
       ORDER BY ui.unit_id, ui."order"`,
        [ids]
      );
    const byUnit = new Map<string, string[]>();
    for (const { unit_id, url } of rows) {
      byUnit.set(unit_id, [...(byUnit.get(unit_id) ?? []), url]);
    }
    return byUnit;
  }
}
