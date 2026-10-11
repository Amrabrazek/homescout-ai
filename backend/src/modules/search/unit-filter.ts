import { UnitFilterInput } from '../unit/dto/unit-filter.input';

/**
 * The one place that turns a UnitFilterInput into both a SQL WHERE clause and a
 * Typesense filter_by string. The SQL expects `units` aliased as "unit" and
 * `projects` as "project"; parameters use TypeORM's named syntax.
 */
export interface CompiledUnitFilter {
  sql: { where: string; params: Record<string, unknown> };
  typesense: string;
}

interface FieldRef {
  sql: string;
  typesense: string;
}

const FIELDS = {
  projectId: { sql: '"unit"."project_id"', typesense: 'projectId' },
  area: { sql: '"project"."area"', typesense: 'area' },
  city: { sql: '"project"."city"', typesense: 'city' },
  region: { sql: '"project"."region"', typesense: 'region' },
  propertyType: { sql: '"unit"."property_type"', typesense: 'propertyType' },
  rooms: { sql: '"unit"."rooms"', typesense: 'rooms' },
  price: { sql: '"unit"."price"', typesense: 'price' },
  floorArea: { sql: '"unit"."floor_area"', typesense: 'floorArea' },
} satisfies Record<string, FieldRef>;

type Condition =
  | { kind: 'oneOf'; field: FieldRef; values: string[] }
  | { kind: 'anyOf'; options: { field: FieldRef; values: string[] }[] }
  | { kind: 'range'; field: FieldRef; min?: number; max?: number }
  | { kind: 'allAmenities'; ids: string[] }
  | { kind: 'text'; term: string };

export function compileUnitFilter(
  filter: UnitFilterInput = {}
): CompiledUnitFilter {
  const conditions = toConditions(filter);
  const params: Record<string, unknown> = {};
  const sql = conditions
    .map((c) => toSql(c, params))
    .filter((clause): clause is string => !!clause);
  const typesense = conditions
    .map(toTypesense)
    .filter((clause): clause is string => !!clause);
  return {
    sql: { where: sql.length ? sql.join(' AND ') : 'TRUE', params },
    typesense: typesense.join(' && '),
  };
}

function toConditions(filter: UnitFilterInput): Condition[] {
  const conditions: Condition[] = [];
  const oneOf = (field: FieldRef, values?: string[]) => {
    if (values?.length) conditions.push({ kind: 'oneOf', field, values });
  };
  const range = (field: FieldRef, min?: number, max?: number) => {
    if (min != null || max != null)
      conditions.push({ kind: 'range', field, min, max });
  };

  if (filter.searchTerm?.trim())
    conditions.push({ kind: 'text', term: filter.searchTerm.trim() });
  oneOf(FIELDS.projectId, filter.projectIds);
  const places = [
    { field: FIELDS.area, values: filter.areas },
    { field: FIELDS.city, values: filter.cities },
    { field: FIELDS.region, values: filter.regions },
  ].filter((p) => p.values?.length);
  if (places.length === 1) oneOf(places[0].field, places[0].values);
  // "New Cairo or West Cairo" names an area and a region: a unit in either matches.
  if (places.length > 1) conditions.push({ kind: 'anyOf', options: places });
  oneOf(FIELDS.propertyType, filter.propertyTypes);
  if (filter.amenityIds?.length)
    conditions.push({ kind: 'allAmenities', ids: filter.amenityIds });
  range(FIELDS.rooms, filter.minRooms, filter.maxRooms);
  range(FIELDS.price, filter.minPrice, filter.maxPrice);
  range(FIELDS.floorArea, filter.minFloorArea, filter.maxFloorArea);
  return conditions;
}

function toSql(c: Condition, params: Record<string, unknown>): string {
  const param = (value: unknown) => {
    const name = `f${Object.keys(params).length}`;
    params[name] = value;
    return name;
  };
  switch (c.kind) {
    case 'text': {
      const p = param(`%${c.term}%`);
      return `("unit"."name" ILIKE :${p} OR "unit"."number" ILIKE :${p})`;
    }
    case 'oneOf':
      return `${c.field.sql} IN (:...${param(c.values)})`;
    case 'anyOf':
      return `(${c.options
        .map((o) => `${o.field.sql} IN (:...${param(o.values)})`)
        .join(' OR ')})`;
    case 'range': {
      const parts: string[] = [];
      if (c.min != null) parts.push(`${c.field.sql} >= :${param(c.min)}`);
      if (c.max != null) parts.push(`${c.field.sql} <= :${param(c.max)}`);
      return parts.join(' AND ');
    }
    case 'allAmenities':
      return `"unit"."id" IN (
        SELECT unit_id FROM unit_amenities WHERE amenity_id IN (:...${param(c.ids)})
        GROUP BY unit_id HAVING COUNT(DISTINCT amenity_id) = :${param(new Set(c.ids).size)}
      )`;
  }
}

function toTypesense(c: Condition): string | undefined {
  switch (c.kind) {
    // Free text goes to Typesense as the query (q), not as a filter.
    case 'text':
      return undefined;
    case 'oneOf':
      return `${c.field.typesense}:=[${c.values.map(quote).join(',')}]`;
    case 'anyOf':
      return `(${c.options
        .map((o) => `${o.field.typesense}:=[${o.values.map(quote).join(',')}]`)
        .join(' || ')})`;
    case 'range':
      if (c.min != null && c.max != null)
        return `${c.field.typesense}:[${c.min}..${c.max}]`;
      return c.min != null
        ? `${c.field.typesense}:>=${c.min}`
        : `${c.field.typesense}:<=${c.max}`;
    case 'allAmenities':
      return c.ids.map((id) => `amenityIds:=${quote(id)}`).join(' && ');
  }
}

function quote(value: string): string {
  return '`' + value.replace(/`/g, '') + '`';
}
