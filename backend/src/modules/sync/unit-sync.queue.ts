import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'pg-boss';
import { EntityManager } from 'typeorm';
import { PgBossService } from '../../common/queue/pg-boss.service';

export const UNIT_SYNC_QUEUE = 'unit-sync';

export interface UnitSyncJob {
  unitId: string;
}

/**
 * Durable queue of units whose embedding and search document must be brought
 * in line with the database.
 */
@Injectable()
export class UnitSyncQueue implements OnModuleInit {
  constructor(private readonly pgBoss: PgBossService) {}

  async onModuleInit() {
    await this.pgBoss.boss.createQueue(UNIT_SYNC_QUEUE, {
      retryLimit: 12,
      retryDelay: 2,
      retryBackoff: true,
    });
  }

  /**
   * Pass the transaction's EntityManager so the jobs commit (or roll back)
   * together with the unit write.
   */
  async enqueue(unitIds: string[], manager?: EntityManager): Promise<void> {
    await this.pgBoss.insert(
      UNIT_SYNC_QUEUE,
      unitIds.map((unitId) => ({
        data: { unitId } satisfies UnitSyncJob,
      })),
      manager
    );
  }

  async fail(jobId: string, error: Error): Promise<void> {
    await this.pgBoss.boss.fail(UNIT_SYNC_QUEUE, jobId, {
      message: error.message,
    });
  }

  work(handler: (jobs: Job<UnitSyncJob>[]) => Promise<void>): Promise<string> {
    return this.pgBoss.boss.work<UnitSyncJob>(
      UNIT_SYNC_QUEUE,
      { batchSize: 50, pollingIntervalSeconds: 1 },
      handler
    );
  }
}
