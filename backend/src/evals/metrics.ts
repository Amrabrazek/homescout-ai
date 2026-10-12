import { UpdatePreferencesInput } from '../modules/buyer/dto/update-preferences.input';
import { ParsedQuery } from '../modules/search/query-parser';
import { EvalUnit } from './eval-unit';

type Filter = ParsedQuery['filter'];
type ScalarKey = Exclude<
  keyof Filter,
  'areas' | 'cities' | 'regions' | 'propertyTypes'
>;

/** A parse's hard filters, with areas, cities and regions as one `places` set. */
export type ExpectedFilter = Partial<Pick<Filter, ScalarKey>> & {
  propertyTypes?: string[];
  places?: string[];
};

const SCALAR_KEYS: ScalarKey[] = [
  'minRooms',
  'maxRooms',
  'minPrice',
  'maxPrice',
  'minFloorArea',
  'maxFloorArea',
  'minFloor',
  'maxFloor',
];

export function toExpectedShape(filter: Filter): ExpectedFilter {
  const shape: ExpectedFilter = {};
  for (const key of SCALAR_KEYS) {
    if (filter[key] != null) shape[key] = filter[key];
  }
  if (filter.propertyTypes?.length)
    shape.propertyTypes = [...new Set(filter.propertyTypes)].sort();
  const places = [
    ...(filter.areas ?? []),
    ...(filter.cities ?? []),
    ...(filter.regions ?? []),
  ];
  if (places.length) shape.places = [...new Set(places)].sort();
  return shape;
}

export interface FilterDiff {
  pass: boolean;
  /** Expected fields the parse left out. */
  missing: string[];
  /** Fields set to a different value. */
  wrong: string[];
  /** Fields set that nobody asked for: these hide good units. */
  extra: string[];
}

export function compareFilters(
  expected: ExpectedFilter,
  actual: ExpectedFilter
): FilterDiff {
  const diff: FilterDiff = { pass: true, missing: [], wrong: [], extra: [] };
  const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  for (const key of keys) {
    const want = normalize(expected[key]);
    const got = normalize(actual[key]);
    if (want === got) continue;
    if (got === undefined) diff.missing.push(key);
    else if (want === undefined) diff.extra.push(key);
    else diff.wrong.push(key);
  }
  diff.pass = !diff.missing.length && !diff.wrong.length && !diff.extra.length;
  return diff;
}

function normalize(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value))
    return value.length ? JSON.stringify([...value].sort()) : undefined;
  return JSON.stringify(value);
}

/** Share of the first k results that are relevant; null when there are none. */
export function precisionAtK(
  ids: string[],
  isRelevant: (id: string) => boolean,
  k: number
): number | null {
  const top = ids.slice(0, k);
  if (top.length === 0) return null;
  return top.filter(isRelevant).length / top.length;
}

/** Nearest-rank percentile, p in 0..100. */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1];
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Whether a unit meets every stated preference. Written apart from the feed's
 * own scorer on purpose: an eval that reuses the code it checks can't catch
 * that code's bugs.
 */
export function meetsPreferences(
  unit: EvalUnit,
  prefs: UpdatePreferencesInput
): boolean {
  if (prefs.budgetMin != null && unit.price < prefs.budgetMin) return false;
  if (prefs.budgetMax != null && unit.price > prefs.budgetMax) return false;
  if (prefs.areas?.length && !prefs.areas.includes(unit.area)) return false;
  if (
    prefs.propertyTypes?.length &&
    !(prefs.propertyTypes as string[]).includes(unit.propertyType)
  )
    return false;
  if (prefs.minRooms != null && unit.rooms < prefs.minRooms) return false;
  if (prefs.minSize != null && unit.floorArea < prefs.minSize) return false;
  return true;
}
