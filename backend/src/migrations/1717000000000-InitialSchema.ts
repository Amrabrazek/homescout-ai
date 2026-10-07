import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1717000000000 implements MigrationInterface {
  name = 'InitialSchema1717000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS vector;

      CREATE TABLE developers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        url TEXT NOT NULL,
        alt_text TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE amenities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        icon TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE units (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        number TEXT,
        floor INTEGER,
        rooms INTEGER,
        bathrooms INTEGER,
        floor_area NUMERIC(10, 2),
        description TEXT,
        price NUMERIC(14, 2),
        embedding vector,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE unit_amenities (
        unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
        amenity_id UUID REFERENCES amenities(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (unit_id, amenity_id)
      );

      CREATE TABLE unit_images (
        unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
        image_id UUID REFERENCES images(id) ON DELETE CASCADE,
        "order" INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (unit_id, image_id)
      );

      CREATE INDEX idx_projects_developer_id ON projects(developer_id);
      CREATE INDEX idx_units_project_id ON units(project_id);
      CREATE INDEX idx_units_price ON units(price);
      CREATE INDEX idx_units_rooms ON units(rooms);
      CREATE INDEX idx_units_floor_area ON units(floor_area);
      CREATE INDEX idx_units_created_at ON units(created_at DESC);
      CREATE INDEX idx_unit_amenities_amenity_id ON unit_amenities(amenity_id);
      CREATE INDEX idx_unit_images_image_id ON unit_images(image_id);

      CREATE OR REPLACE FUNCTION trigger_set_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER set_timestamp BEFORE UPDATE ON developers
        FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
      CREATE TRIGGER set_timestamp BEFORE UPDATE ON projects
        FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
      CREATE TRIGGER set_timestamp BEFORE UPDATE ON images
        FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
      CREATE TRIGGER set_timestamp BEFORE UPDATE ON amenities
        FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
      CREATE TRIGGER set_timestamp BEFORE UPDATE ON units
        FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

      CREATE OR REPLACE FUNCTION match_similar_units(
        unit_id UUID,
        match_threshold FLOAT DEFAULT 0.7,
        match_count INT DEFAULT 5
      )
      RETURNS TABLE (id UUID, similarity FLOAT)
      LANGUAGE SQL STABLE
      AS $$
        WITH target_unit AS (
          SELECT embedding, project_id FROM units WHERE id = unit_id
        ),
        similar_units AS (
          SELECT
            units.id,
            1 - (units.embedding <=> (SELECT embedding FROM target_unit)) AS similarity
          FROM units, target_unit
          WHERE units.id != unit_id
            AND units.embedding IS NOT NULL
            AND (SELECT embedding FROM target_unit) IS NOT NULL
            AND 1 - (units.embedding <=> (SELECT embedding FROM target_unit)) > match_threshold
          ORDER BY units.embedding <=> (SELECT embedding FROM target_unit)
          LIMIT match_count
        ),
        similar_count AS (
          SELECT COUNT(*) AS count FROM similar_units
        ),
        random_units AS (
          SELECT units.id, 0 AS similarity
          FROM units, target_unit
          WHERE units.id != unit_id
            AND units.id NOT IN (SELECT id FROM similar_units)
            AND units.project_id = (SELECT project_id FROM target_unit)
          ORDER BY RANDOM()
          LIMIT (
            SELECT CASE WHEN count < match_count THEN match_count - count ELSE 0 END
            FROM similar_count
          )
        )
        SELECT id, similarity FROM similar_units
        UNION ALL
        SELECT id, similarity FROM random_units;
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS match_similar_units(UUID, FLOAT, INT);
      DROP TABLE IF EXISTS unit_images;
      DROP TABLE IF EXISTS unit_amenities;
      DROP TABLE IF EXISTS units;
      DROP TABLE IF EXISTS amenities;
      DROP TABLE IF EXISTS images;
      DROP TABLE IF EXISTS projects;
      DROP TABLE IF EXISTS developers;
      DROP FUNCTION IF EXISTS trigger_set_timestamp();
    `);
  }
}
