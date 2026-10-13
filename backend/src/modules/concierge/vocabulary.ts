import { editDistance } from '../search/query-parser';

export interface LocationRow {
  area: string | null;
  city: string | null;
  region: string | null;
}

export interface ResolvedLocations {
  areas: string[];
  cities: string[];
  regions: string[];
  unknown: string[];
}

export interface NamedItem {
  id: string;
  name: string;
}

/** Nicknames buyers use that no area, city or region name contains. */
const PLACE_ALIASES: Record<string, string> = {
  'new capital': 'New Administrative Capital',
  'the new capital': 'New Administrative Capital',
  'new admin capital': 'New Administrative Capital',
  nac: 'New Administrative Capital',
  tagamoa: 'Fifth Settlement',
  'el tagamoa': 'Fifth Settlement',
  '5th settlement': 'Fifth Settlement',
  sahel: 'North Coast',
  'el sahel': 'North Coast',
  'el mostakbal': 'Mostakbal City',
  '6 october': '6th of October',
  '6th october': '6th of October',
  'el sokhna': 'Ain Sokhna',
  alex: 'Alexandria',
};

/**
 * Maps what a buyer calls a place to names in the data. An exact area, city or
 * region wins; otherwise a partial name expands to every area containing it
 * ("Zayed" → Sheikh Zayed and New Zayed); otherwise a close typo is accepted.
 */
export function resolveLocations(
  names: string[],
  rows: LocationRow[]
): ResolvedLocations {
  const result: ResolvedLocations = {
    areas: [],
    cities: [],
    regions: [],
    unknown: [],
  };
  const kinds = [
    ['areas', distinct(rows.map((r) => r.area))],
    ['cities', distinct(rows.map((r) => r.city))],
    ['regions', distinct(rows.map((r) => r.region))],
  ] as const;
  const add = (kind: keyof ResolvedLocations, value: string) => {
    if (!result[kind].includes(value)) result[kind].push(value);
  };

  for (const raw of names) {
    const typed = normalize(raw);
    if (!typed) continue;
    const name = normalize(PLACE_ALIASES[typed] ?? typed);

    const exact = kinds
      .map(([kind, values]) => ({
        kind,
        value: values.find((v) => normalize(v) === name),
      }))
      .find((m) => m.value);
    if (exact) {
      add(exact.kind, exact.value);
      continue;
    }

    const partial = kinds[0][1].filter((area) =>
      ` ${normalize(area)} `.includes(` ${name} `)
    );
    if (partial.length) {
      partial.forEach((area) => add('areas', area));
      continue;
    }

    const typo = closest(
      name,
      kinds.flatMap(([kind, values]) =>
        values.map((value) => ({ kind, value }))
      )
    );
    if (typo) add(typo.kind, typo.value);
    else result.unknown.push(raw);
  }
  return result;
}

/** Every area that falls under the resolved areas, cities or regions. */
export function expandToAreas(
  resolved: Pick<ResolvedLocations, 'areas' | 'cities' | 'regions'>,
  rows: LocationRow[]
): string[] {
  return distinct(
    rows
      .filter(
        (r) =>
          resolved.areas.includes(r.area) ||
          resolved.cities.includes(r.city) ||
          resolved.regions.includes(r.region)
      )
      .map((r) => r.area)
  );
}

/** Amenity names to IDs, accepting partial names ("pool", "schools"). */
export function resolveAmenities(
  names: string[],
  amenities: NamedItem[]
): { ids: string[]; unknown: string[] } {
  const ids: string[] = [];
  const unknown: string[] = [];
  for (const raw of names) {
    const name = normalize(raw);
    const id =
      amenities.find((a) => normalize(a.name) === name)?.id ??
      amenities.find((a) => name && normalize(a.name).includes(name))?.id ??
      closest(
        name,
        amenities.map((a) => ({ kind: a.id, value: a.name }))
      )?.kind;
    if (!id) unknown.push(raw);
    else if (!ids.includes(id)) ids.push(id);
  }
  return { ids, unknown };
}

function closest<K extends string>(
  name: string,
  candidates: { kind: K; value: string }[]
): { kind: K; value: string } | undefined {
  let best: { kind: K; value: string; distance: number } | undefined;
  for (const c of candidates) {
    const distance = editDistance(name, normalize(c.value));
    if (
      distance <= allowedTypos(c.value) &&
      (!best || distance < best.distance)
    )
      best = { ...c, distance };
  }
  return best && { kind: best.kind, value: best.value };
}

function allowedTypos(name: string): number {
  if (name.length <= 4) return 0;
  return name.length <= 8 ? 1 : 2;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function distinct(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))];
}
