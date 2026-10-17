import { DataSource } from 'typeorm';

export interface ParseCacheKey {
  /** Normalized words the regex could not parse. */
  leftover: string;
  /** Filter groups the regex already set, comma-separated. */
  found: string;
  model: string;
  promptVersion: string;
}

/** Stores raw LLM parse output. Callers validate what they read back. */
export interface ParseCache {
  get(key: ParseCacheKey): Promise<unknown>;
  set(key: ParseCacheKey, output: unknown): Promise<void>;
  delete(key: ParseCacheKey): Promise<void>;
}

/** Postgres-backed parse cache; rows older than `ttlDays` are ignored and pruned. */
export class PgParseCache implements ParseCache {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ttlDays: number
  ) {}

  async get({
    leftover,
    found,
    model,
    promptVersion,
  }: ParseCacheKey): Promise<unknown> {
    const [row] = await this.dataSource.query(
      `SELECT output FROM search_parse_cache
        WHERE leftover = $1 AND found = $2 AND model = $3 AND prompt_version = $4
          AND created_at > NOW() - make_interval(days => $5)`,
      [leftover, found, model, promptVersion, this.ttlDays]
    );
    return row?.output;
  }

  async set(
    { leftover, found, model, promptVersion }: ParseCacheKey,
    output: unknown
  ): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO search_parse_cache (leftover, found, model, prompt_version, output)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (leftover, found, model, prompt_version)
       DO UPDATE SET output = EXCLUDED.output, created_at = NOW()`,
      [leftover, found, model, promptVersion, JSON.stringify(output)]
    );
  }

  async delete({
    leftover,
    found,
    model,
    promptVersion,
  }: ParseCacheKey): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM search_parse_cache
        WHERE leftover = $1 AND found = $2 AND model = $3 AND prompt_version = $4`,
      [leftover, found, model, promptVersion]
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
