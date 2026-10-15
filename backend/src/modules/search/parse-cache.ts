import { DataSource } from 'typeorm';

export interface ParseCacheKey {
  query: string;
  model: string;
  promptVersion: string;
}

/** Stores raw LLM parse output. Callers validate what they read back. */
export interface ParseCache {
  get(key: ParseCacheKey): Promise<unknown>;
  set(key: ParseCacheKey, output: unknown): Promise<void>;
}

/** Postgres-backed parse cache; rows older than `ttlDays` are ignored and pruned. */
export class PgParseCache implements ParseCache {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ttlDays: number
  ) {}

  async get({ query, model, promptVersion }: ParseCacheKey): Promise<unknown> {
    const [row] = await this.dataSource.query(
      `SELECT output FROM search_parse_cache
        WHERE query = $1 AND model = $2 AND prompt_version = $3
          AND created_at > NOW() - make_interval(days => $4)`,
      [query, model, promptVersion, this.ttlDays]
    );
    return row?.output;
  }

  async set(
    { query, model, promptVersion }: ParseCacheKey,
    output: unknown
  ): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO search_parse_cache (query, model, prompt_version, output)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (query, model, prompt_version)
       DO UPDATE SET output = EXCLUDED.output, created_at = NOW()`,
      [query, model, promptVersion, JSON.stringify(output)]
    );
  }

  async prune(): Promise<number> {
    const [, deleted] = await this.dataSource.query(
      `DELETE FROM search_parse_cache
        WHERE created_at <= NOW() - make_interval(days => $1)`,
      [this.ttlDays]
    );
    return deleted ?? 0;
  }
}
