import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * pg-boss 11+ cannot migrate the v10 queue schema (version 24), so drop it and
 * let pg-boss create a fresh one on start. Jobs are derived from Postgres data:
 * `npm run reindex` re-enqueues unit syncs, and buyer taste is recomputed on
 * the buyer's next event.
 */
export class DropPgBossV10Schema1760300000000 implements MigrationInterface {
  name = 'DropPgBossV10Schema1760300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [row] = await queryRunner.query(
      `SELECT to_regclass('pgboss.version') IS NOT NULL AS exists`
    );
    if (!row.exists) return;

    const [{ version }] = await queryRunner.query(
      'SELECT version FROM pgboss.version'
    );
    if (version < 25) {
      await queryRunner.query('DROP SCHEMA pgboss CASCADE');
    }
  }

  public async down(): Promise<void> {
    // Dropped jobs can't be restored; pg-boss 10 recreates its schema on start.
  }
}
