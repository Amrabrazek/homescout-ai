import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { JobInsert, PgBoss } from 'pg-boss';
import { EntityManager } from 'typeorm';
import { databaseOptions } from '../../config/database.config';

/**
 * One pg-boss instance (job queues stored in Postgres) shared by every queue
 * in the app, so each queue doesn't open its own connection pool.
 */
@Injectable()
export class PgBossService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgBossService.name);
  readonly boss: PgBoss;

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
  }

  async onModuleDestroy() {
    await this.boss.stop({ graceful: true, timeout: 10_000 });
  }

  /**
   * Pass the transaction's EntityManager so the jobs commit (or roll back)
   * together with the write that caused them.
   */
  async insert(queue: string, jobs: JobInsert[], manager?: EntityManager) {
    if (jobs.length === 0) return;
    const db = manager && {
      executeSql: async (text: string, values: unknown[]) => ({
        rows: await manager.query(text, values),
      }),
    };
    await this.boss.insert(queue, jobs, db ? { db } : undefined);
  }
}
