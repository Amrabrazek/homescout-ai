import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../config/database.config';
import { DEFAULT_SEED, generateDataset } from './seed/generate';
import { insertDataset } from './seed/insert';

async function main() {
  const logger = new Logger('Seed');
  const dataSource = new DataSource(databaseOptions());
  await dataSource.initialize();

  try {
    const applied = await dataSource.runMigrations({ transaction: 'each' });
    logger.log(`Applied ${applied.length} migration(s)`);

    const reset = process.argv.includes('--reset');
    const [{ count }] = await dataSource.query(
      'SELECT COUNT(*)::int AS count FROM units'
    );
    if (count > 0 && !reset) {
      logger.log(
        `Database already has ${count} units, skipping seed (use --reset to replace them)`
      );
      return;
    }

    const data = generateDataset(DEFAULT_SEED);
    await dataSource.transaction(async (manager) => {
      await manager.query(
        'TRUNCATE unit_images, unit_amenities, units, images, amenities, projects, developers CASCADE'
      );
      await insertDataset(manager, data);
    });
    logger.log(
      `Seeded ${data.units.length} units in ${data.projects.length} projects`
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
