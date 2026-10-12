import { DataSource } from 'typeorm';

/** The unit facts the evals judge results by, loaded with plain SQL. */
export interface EvalUnit {
  id: string;
  propertyType: string | null;
  price: number;
  rooms: number;
  floorArea: number;
  finishing: string | null;
  view: string | null;
  deliveryYear: number | null;
  area: string | null;
  region: string | null;
  amenities: string[];
}

export async function loadEvalUnits(
  dataSource: DataSource
): Promise<Map<string, EvalUnit>> {
  const rows = await dataSource.query(
    `SELECT u.id, u.property_type, u.price, u.rooms, u.floor_area, u.finishing,
            u.view, u.delivery_year, p.area, p.region,
            COALESCE(array_agg(a.name) FILTER (WHERE a.name IS NOT NULL), '{}') AS amenities
     FROM units u
     JOIN projects p ON p.id = u.project_id
     LEFT JOIN unit_amenities ua ON ua.unit_id = u.id
     LEFT JOIN amenities a ON a.id = ua.amenity_id
     GROUP BY u.id, p.area, p.region
     ORDER BY u.id`
  );
  return new Map(
    rows.map((r): [string, EvalUnit] => [
      r.id,
      {
        id: r.id,
        propertyType: r.property_type,
        price: Number(r.price),
        rooms: r.rooms,
        floorArea: Number(r.floor_area),
        finishing: r.finishing,
        view: r.view,
        deliveryYear: r.delivery_year,
        area: r.area,
        region: r.region,
        amenities: r.amenities,
      },
    ])
  );
}
