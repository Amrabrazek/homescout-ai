import { MigrationInterface, QueryRunner } from 'typeorm';

export class Conversations1760600000000 implements MigrationInterface {
  name = 'Conversations1760600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE conversations (
        id TEXT PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_-]{1,64}$'),
        buyer_id UUID NOT NULL REFERENCES buyer_profiles(id) ON DELETE CASCADE,
        messages JSONB NOT NULL DEFAULT '[]',
        summary TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_conversations_buyer ON conversations (buyer_id, updated_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS conversations`);
  }
}
