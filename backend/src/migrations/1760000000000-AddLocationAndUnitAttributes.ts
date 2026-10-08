import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocationAndUnitAttributes1760000000000
  implements MigrationInterface
{
  name = 'AddLocationAndUnitAttributes1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE projects
        ADD COLUMN area TEXT,
        ADD COLUMN city TEXT,
        ADD COLUMN region TEXT,
        ADD COLUMN lat NUMERIC(9, 6),
        ADD COLUMN lng NUMERIC(9, 6);

      ALTER TABLE units
        ADD COLUMN property_type TEXT
          CHECK (property_type IN ('studio', 'apartment', 'duplex', 'penthouse', 'townhouse',
                                   'twin_house', 'villa', 'chalet', 'serviced_apartment')),
        ADD COLUMN finishing TEXT
          CHECK (finishing IN ('core_shell', 'semi_finished', 'fully_finished', 'furnished')),
        ADD COLUMN delivery_year INTEGER,
        ADD COLUMN down_payment_pct NUMERIC(5, 2)
          CHECK (down_payment_pct BETWEEN 0 AND 100),
        ADD COLUMN installment_years INTEGER
          CHECK (installment_years >= 0),
        ADD COLUMN view TEXT
          CHECK (view IN ('garden', 'sea', 'pool', 'city', 'street'));

      CREATE INDEX idx_projects_region ON projects(region);
      CREATE INDEX idx_projects_area ON projects(area);
      CREATE INDEX idx_units_property_type ON units(property_type);
      CREATE INDEX idx_units_finishing ON units(finishing);
      CREATE INDEX idx_units_delivery_year ON units(delivery_year);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_units_delivery_year;
      DROP INDEX IF EXISTS idx_units_finishing;
      DROP INDEX IF EXISTS idx_units_property_type;
      DROP INDEX IF EXISTS idx_projects_area;
      DROP INDEX IF EXISTS idx_projects_region;

      ALTER TABLE units
        DROP COLUMN view,
        DROP COLUMN installment_years,
        DROP COLUMN down_payment_pct,
        DROP COLUMN delivery_year,
        DROP COLUMN finishing,
        DROP COLUMN property_type;

      ALTER TABLE projects
        DROP COLUMN lng,
        DROP COLUMN lat,
        DROP COLUMN region,
        DROP COLUMN city,
        DROP COLUMN area;
    `);
  }
}
