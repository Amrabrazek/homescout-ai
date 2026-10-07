import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../config/database.config';

async function main() {
  const logger = new Logger('Seed');
  const dataSource = new DataSource(databaseOptions());
  await dataSource.initialize();

  try {
    const applied = await dataSource.runMigrations({ transaction: 'each' });
    logger.log(`Applied ${applied.length} migration(s)`);

    const [{ count }] = await dataSource.query(
      'SELECT COUNT(*)::int AS count FROM units'
    );
    if (count > 0 && !process.argv.includes('--force')) {
      logger.log(`Database already has ${count} units, skipping seed`);
      return;
    }

    const sql = readFileSync(join(process.cwd(), 'db', 'seed.sql'), 'utf8');
    await dataSource.query(sql);
    const [{ total }] = await dataSource.query(
      'SELECT COUNT(*)::int AS total FROM units'
    );
    logger.log(`Seeded ${total} units`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
