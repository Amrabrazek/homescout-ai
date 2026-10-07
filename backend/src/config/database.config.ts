import { join } from 'path';
import { DataSourceOptions } from 'typeorm';

export function databaseOptions(
  env: NodeJS.ProcessEnv = process.env
): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: parseInt(env.DB_PORT ?? '5432', 10),
    username: env.DB_USERNAME ?? 'homescout',
    password: env.DB_PASSWORD ?? 'homescout',
    database: env.DB_NAME ?? 'homescout',
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
    synchronize: false,
  };
}
