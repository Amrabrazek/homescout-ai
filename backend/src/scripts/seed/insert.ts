import { randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import { SeedDataset } from './generate';

const BATCH_SIZE = 500;

export async function insertDataset(
  manager: EntityManager,
  data: SeedDataset
): Promise<void> {
  const developerIds = new Map(data.developers.map((d) => [d, randomUUID()]));
  await insertRows(
    manager,
    'developers',
    ['id', 'name'],
    data.developers.map((name) => [developerIds.get(name), name])
  );

  const amenityIds = new Map(data.amenities.map((a) => [a.name, randomUUID()]));
  await insertRows(
    manager,
    'amenities',
    ['id', 'name', 'icon'],
    data.amenities.map((a) => [amenityIds.get(a.name), a.name, a.icon])
  );

  const imageIds = data.images.map(() => randomUUID());
  await insertRows(
    manager,
    'images',
    ['id', 'url', 'alt_text'],
    data.images.map((img, i) => [imageIds[i], img.url, img.altText])
  );

  const projectIds = data.projects.map(() => randomUUID());
  await insertRows(
    manager,
    'projects',
    ['id', 'name', 'developer_id', 'area', 'city', 'region', 'lat', 'lng'],
    data.projects.map((p, i) => [
      projectIds[i],
      p.name,
      developerIds.get(p.developer),
      p.area,
      p.city,
      p.region,
      p.lat,
      p.lng,
    ])
  );

  const unitIds = data.units.map(() => randomUUID());
  await insertRows(
    manager,
    'units',
    [
      'id',
      'project_id',
      'name',
      'number',
      'floor',
      'rooms',
      'bathrooms',
      'floor_area',
      'price',
      'description',
      'property_type',
      'finishing',
      'delivery_year',
      'down_payment_pct',
      'installment_years',
      'view',
      'created_at',
    ],
    data.units.map((u, i) => [
      unitIds[i],
      projectIds[u.project],
      u.name,
      u.number,
      u.floor,
      u.rooms,
      u.bathrooms,
      u.floorArea,
      u.price,
      u.description,
      u.propertyType,
      u.finishing,
      u.deliveryYear,
      u.downPaymentPct,
      u.installmentYears,
      u.view,
      u.createdAt,
    ])
  );

  await insertRows(
    manager,
    'unit_amenities',
    ['unit_id', 'amenity_id'],
    data.units.flatMap((u, i) =>
      u.amenities.map((name) => [unitIds[i], amenityIds.get(name)])
    )
  );

  await insertRows(
    manager,
    'unit_images',
    ['unit_id', 'image_id', '"order"'],
    data.units.flatMap((u, i) =>
      u.images.map((img, order) => [unitIds[i], imageIds[img], order + 1])
    )
  );
}

async function insertRows(
  manager: EntityManager,
  table: string,
  columns: string[],
  rows: unknown[][]
): Promise<void> {
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    const params: unknown[] = [];
    const values = batch.map((row) => {
      const placeholders = row.map((value) => {
        params.push(value);
        return `$${params.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });
    await manager.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values.join(', ')}`,
      params
    );
  }
}
