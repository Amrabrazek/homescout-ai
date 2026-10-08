import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnitEmbeddings1760100000000 implements MigrationInterface {
  name = 'UnitEmbeddings1760100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE unit_embeddings (
        unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
        model TEXT NOT NULL,
        embedding vector NOT NULL,
        content_hash TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (unit_id, model)
      );

      -- The column has no fixed size so several models can coexist; HNSW needs one,
      -- so each model gets a partial index on a cast to its dimension.
      CREATE INDEX idx_unit_embeddings_local_e5_small ON unit_embeddings
        USING hnsw ((embedding::vector(384)) vector_cosine_ops)
        WHERE model = 'local-e5-small';
      CREATE INDEX idx_unit_embeddings_openai_3_small ON unit_embeddings
        USING hnsw ((embedding::vector(1536)) vector_cosine_ops)
        WHERE model = 'openai-text-embedding-3-small';

      ALTER TABLE units DROP COLUMN embedding;

      DROP FUNCTION IF EXISTS match_similar_units(UUID, FLOAT, INT);

      CREATE FUNCTION match_similar_units(
        target_id UUID,
        embedding_model TEXT,
        match_threshold FLOAT DEFAULT 0,
        match_count INT DEFAULT 5
      )
      RETURNS TABLE (id UUID, similarity FLOAT)
      LANGUAGE plpgsql STABLE
      AS $fn$
      DECLARE
        dims INT;
      BEGIN
        SELECT vector_dims(e.embedding) INTO dims
        FROM unit_embeddings e
        WHERE e.unit_id = target_id AND e.model = embedding_model;

        IF dims IS NULL THEN
          RETURN;
        END IF;

        -- Built dynamically so the cast and model literal match the partial HNSW index.
        RETURN QUERY EXECUTE format($q$
          SELECT nearest.unit_id, nearest.similarity FROM (
            SELECT e.unit_id, 1 - (e.embedding::vector(%1$s) <=> t.v) AS similarity
            FROM unit_embeddings e,
              (SELECT embedding::vector(%1$s) AS v FROM unit_embeddings
               WHERE unit_id = $1 AND model = %2$L) t
            WHERE e.model = %2$L AND e.unit_id <> $1
            ORDER BY e.embedding::vector(%1$s) <=> t.v
            LIMIT $3
          ) nearest
          WHERE nearest.similarity >= $2
        $q$, dims, embedding_model)
        USING target_id, match_threshold, match_count;
      END;
      $fn$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS match_similar_units(UUID, TEXT, FLOAT, INT);
      DROP TABLE IF EXISTS unit_embeddings;
      ALTER TABLE units ADD COLUMN embedding vector;

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
}
