import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import PgBoss = require('pg-boss');
import { EntityManager } from 'typeorm';
import { databaseOptions } from '../../config/database.config';

export const UNIT_SYNC_QUEUE = 'unit-sync';

export interface UnitSyncJob {
  unitId: string;
}

/**
 * Durable queue (pg-boss, in Postgres) of units whose embedding and search
 * document must be brought in line with the database.
 */
@Injectable()
export class UnitSyncQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UnitSyncQueue.name);
  private readonly boss: PgBoss;

  constructor() {
    const db = databaseOptions() as {
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
    };
    this.boss = new PgBoss({
      host: db.host,
      port: db.port,
      user: db.username,
      password: db.password,
      database: db.database,
      max: 4,
      schedule: false,
    });
    this.boss.on('error', (error) =>
      this.logger.error(`pg-boss: ${error.message}`)
    );
  }

  async onModuleInit() {
    await this.boss.start();
    await this.boss.createQueue(UNIT_SYNC_QUEUE, {
      name: UNIT_SYNC_QUEUE,
      retryLimit: 12,
      retryDelay: 2,
      retryBackoff: true,
    });
  }

  async onModuleDestroy() {
    await this.boss.stop({ graceful: true, timeout: 10_000 });
  }

  /**
   * Pass the transaction's EntityManager so the jobs commit (or roll back)
   * together with the unit write.
   */
  async enqueue(unitIds: string[], manager?: EntityManager): Promise<void> {
    if (unitIds.length === 0) return;
    const jobs = unitIds.map((unitId) => ({
      name: UNIT_SYNC_QUEUE,
      data: { unitId } satisfies UnitSyncJob,
    }));
    const db = manager && {
      executeSql: async (text: string, values: unknown[]) => ({
        rows: await manager.query(text, values),
      }),
    };
    await this.boss.insert(jobs, db ? { db } : undefined);
  }

  work(
    handler: (jobs: PgBoss.Job<UnitSyncJob>[]) => Promise<void>
  ): Promise<string> {
    return this.boss.work<UnitSyncJob>(
      UNIT_SYNC_QUEUE,
      { batchSize: 50, pollingIntervalSeconds: 1 },
      handler
    );
  }
}
