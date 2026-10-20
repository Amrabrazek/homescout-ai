import { MigrationInterface, QueryRunner } from 'typeorm';

export class BuyerFacts1760500000000 implements MigrationInterface {
  name = 'BuyerFacts1760500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE buyer_facts (
        id BIGSERIAL PRIMARY KEY,
        buyer_id UUID NOT NULL REFERENCES buyer_profiles(id) ON DELETE CASCADE,
        text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 200),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_buyer_facts_buyer ON buyer_facts (buyer_id, created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS buyer_facts`);
  }
}
