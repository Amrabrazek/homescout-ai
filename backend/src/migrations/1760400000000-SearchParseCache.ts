import { MigrationInterface, QueryRunner } from 'typeorm';

export class SearchParseCache1760400000000 implements MigrationInterface {
  name = 'SearchParseCache1760400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE search_parse_cache (
        query TEXT NOT NULL,
        model TEXT NOT NULL,
        prompt_version TEXT NOT NULL,
        -- Raw LLM output; it is validated again on every read.
        output JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (query, model, prompt_version)
      );

      CREATE INDEX idx_search_parse_cache_created ON search_parse_cache (created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS search_parse_cache`);
  }
}
