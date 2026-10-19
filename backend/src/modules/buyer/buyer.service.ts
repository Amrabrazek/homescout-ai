import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { BuyerProfile } from '../../common/entities/buyer-profile.entity';
import { Unit } from '../../common/entities/unit.entity';
import { BuyerEventType } from '../../common/enums/buyer-event-type';
import {
  EMBEDDING_PROVIDER,
  EmbeddingProvider,
} from '../embedding/embedding.provider';
import { UnitService } from '../unit/unit.service';
import { BuyerTasteQueue } from './buyer-taste.queue';
import { UpdatePreferencesInput } from './dto/update-preferences.input';
import { computeTasteVector } from './taste-vector';

export interface BuyerActivity {
  views: number;
  saves: number;
  skips: number;
}

const FOREIGN_KEY_VIOLATION = '23503';

@Injectable()
export class BuyerService {
  constructor(
    @InjectRepository(BuyerProfile)
    private readonly profiles: Repository<BuyerProfile>,
    private readonly dataSource: DataSource,
    private readonly unitService: UnitService,
    private readonly tasteQueue: BuyerTasteQueue,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: EmbeddingProvider
  ) {}

  /** The stored profile, or an empty one for a buyer we haven't seen yet. */
  async getProfile(buyerId: string): Promise<BuyerProfile> {
    const profile = await this.profiles.findOneBy({ id: buyerId });
    if (profile) return profile;
    const now = new Date();
    return this.profiles.create({
      id: buyerId,
      areas: [],
      propertyTypes: [],
      amenityIds: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  async updatePreferences(
    buyerId: string,
    input: UpdatePreferencesInput
  ): Promise<BuyerProfile> {
    const changes: Partial<BuyerProfile> = { ...input };
    for (const key of ['areas', 'propertyTypes', 'amenityIds'] as const) {
      if (key in input && input[key] == null) changes[key] = [];
    }
    await this.ensureProfile(this.dataSource.manager, buyerId);
    if (Object.keys(changes).length > 0) {
      await this.profiles.update(buyerId, changes);
    }
    return this.getProfile(buyerId);
  }

  async recordEvent(
    buyerId: string,
    unitId: string,
    type: BuyerEventType
  ): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await this.ensureProfile(manager, buyerId);
        await manager.query(
          `INSERT INTO buyer_events (buyer_id, unit_id, type) VALUES ($1, $2, $3)`,
          [buyerId, unitId, type]
        );
        await this.tasteQueue.enqueue(buyerId, manager);
      });
    } catch (error) {
      if (error.code === FOREIGN_KEY_VIOLATION) {
        throw new NotFoundException(`Unit with ID ${unitId} not found`);
      }
      throw error;
    }
  }

  async unsaveUnit(buyerId: string, unitId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `DELETE FROM buyer_events WHERE buyer_id = $1 AND unit_id = $2 AND type = $3`,
        [buyerId, unitId, BuyerEventType.SAVE]
      );
      await this.tasteQueue.enqueue(buyerId, manager);
    });
  }

  /** Forgets everything: preferences, taste vector and (by cascade) events. */
  async reset(buyerId: string): Promise<BuyerProfile> {
    await this.profiles.delete(buyerId);
    return this.getProfile(buyerId);
  }

  async savedUnitIds(buyerId: string): Promise<string[]> {
    const rows: { unit_id: string }[] = await this.dataSource.query(
      `SELECT unit_id FROM buyer_events
       WHERE buyer_id = $1 AND type = $2
       GROUP BY unit_id
       ORDER BY MAX(created_at) DESC`,
      [buyerId, BuyerEventType.SAVE]
    );
    return rows.map((r) => r.unit_id);
  }

  /** The units of one event type, most recent first. */
  async recentUnitIds(
    buyerId: string,
    type: BuyerEventType,
    limit: number
  ): Promise<string[]> {
    const rows: { unit_id: string }[] = await this.dataSource.query(
      `SELECT unit_id FROM buyer_events
       WHERE buyer_id = $1 AND type = $2
       GROUP BY unit_id
       ORDER BY MAX(created_at) DESC
       LIMIT $3`,
      [buyerId, type, limit]
    );
    return rows.map((r) => r.unit_id);
  }

  async skippedUnitIds(buyerId: string): Promise<string[]> {
    const rows: { unit_id: string }[] = await this.dataSource.query(
      `SELECT DISTINCT unit_id FROM buyer_events WHERE buyer_id = $1 AND type = $2`,
      [buyerId, BuyerEventType.SKIP]
    );
    return rows.map((r) => r.unit_id);
  }

  /** Units the buyer already saved or skipped; the feed doesn't offer them again. */
  async decidedUnitIds(buyerId: string): Promise<string[]> {
    const rows: { unit_id: string }[] = await this.dataSource.query(
      `SELECT DISTINCT unit_id FROM buyer_events
       WHERE buyer_id = $1 AND type IN ($2, $3)`,
      [buyerId, BuyerEventType.SAVE, BuyerEventType.SKIP]
    );
    return rows.map((r) => r.unit_id);
  }

  async savedUnits(buyerId: string): Promise<Unit[]> {
    return this.unitService.findManyByIds(await this.savedUnitIds(buyerId));
  }

  /** Distinct units per event type. */
  async activity(buyerId: string): Promise<BuyerActivity> {
    const rows: { type: BuyerEventType; units: number }[] =
      await this.dataSource.query(
        `SELECT type, COUNT(DISTINCT unit_id)::int AS units
         FROM buyer_events WHERE buyer_id = $1 GROUP BY type`,
        [buyerId]
      );
    const count = (type: BuyerEventType) =>
      rows.find((r) => r.type === type)?.units ?? 0;
    return {
      views: count(BuyerEventType.VIEW),
      saves: count(BuyerEventType.SAVE),
      skips: count(BuyerEventType.SKIP),
    };
  }

  /** The taste vector, if one exists for the active embedding model. */
  async tasteVector(buyerId: string): Promise<number[] | null> {
    const [row] = await this.dataSource.query(
      `SELECT taste_vector::text AS taste FROM buyer_profiles
       WHERE id = $1 AND taste_model = $2 AND taste_vector IS NOT NULL`,
      [buyerId, this.embeddings.model]
    );
    return row ? JSON.parse(row.taste) : null;
  }

  async recomputeTaste(buyerId: string): Promise<number[] | null> {
    const model = this.embeddings.model;
    const rows: {
      unit_id: string;
      type: BuyerEventType;
      created_at: Date;
      embedding: string;
    }[] = await this.dataSource.query(
      `SELECT ev.unit_id, ev.type, ev.created_at, ue.embedding::text AS embedding
       FROM buyer_events ev
       JOIN unit_embeddings ue ON ue.unit_id = ev.unit_id AND ue.model = $2
       WHERE ev.buyer_id = $1`,
      [buyerId, model]
    );
    const taste = computeTasteVector(
      rows.map((r) => ({
        unitId: r.unit_id,
        type: r.type,
        createdAt: new Date(r.created_at),
        embedding: JSON.parse(r.embedding),
      }))
    );
    await this.dataSource.query(
      `UPDATE buyer_profiles
       SET taste_vector = $2::vector, taste_model = $3, updated_at = NOW()
       WHERE id = $1`,
      [buyerId, taste && `[${taste.join(',')}]`, taste && model]
    );
    return taste;
  }

  private async ensureProfile(manager: EntityManager, buyerId: string) {
    await manager.query(
      `INSERT INTO buyer_profiles (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
      [buyerId]
    );
  }
}
