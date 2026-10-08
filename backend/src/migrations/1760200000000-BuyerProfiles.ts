import { MigrationInterface, QueryRunner } from 'typeorm';

export class BuyerProfiles1760200000000 implements MigrationInterface {
  name = 'BuyerProfiles1760200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE buyer_profiles (
        id UUID PRIMARY KEY,
        budget_min NUMERIC(14, 2) CHECK (budget_min >= 0),
        budget_max NUMERIC(14, 2) CHECK (budget_max >= 0),
        areas TEXT[] NOT NULL DEFAULT '{}',
        property_types TEXT[] NOT NULL DEFAULT '{}',
        min_rooms INTEGER CHECK (min_rooms >= 0),
        min_size NUMERIC(10, 2) CHECK (min_size >= 0),
        amenities UUID[] NOT NULL DEFAULT '{}',
        -- Vectors from different embedding models can't be compared, so the
        -- model that produced taste_vector is stored next to it.
        taste_vector vector,
        taste_model TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE buyer_events (
        id BIGSERIAL PRIMARY KEY,
        buyer_id UUID NOT NULL REFERENCES buyer_profiles(id) ON DELETE CASCADE,
        unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('view', 'save', 'skip')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_buyer_events_buyer ON buyer_events (buyer_id, type, created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS buyer_events;
      DROP TABLE IF EXISTS buyer_profiles;
    `);
  }
}
