import { Unit } from '../../common/entities/unit.entity';
import { UnitFilterInput } from './dto/unit-filter.input';

export const SIMILAR_CANDIDATES = 30;
const MAX_PER_PROJECT = 2;
const PRICE_BAND = 0.3;
const WEIGHTS = { vector: 0.5, price: 0.2, area: 0.15, fit: 0.15 };

export interface SimilarCandidate {
  unit: Unit;
  similarity: number | null;
}

export interface RankedUnit {
  unit: Unit;
  score: number;
  reasons: string[];
}

/**
 * Candidate filters from strict to loose. The caller stops at the first tier
 * that yields enough candidates, so rare units still get neighbours.
 */
export function similarityTiers(seed: Unit): UnitFilterInput[] {
  const price = Number(seed.price);
  const band = (pct: number) =>
    price > 0
      ? { minPrice: price * (1 - pct), maxPrice: price * (1 + pct) }
      : {};
  const type = seed.propertyType ? { propertyTypes: [seed.propertyType] } : {};
  const region = seed.project?.region ? { regions: [seed.project.region] } : {};

  return [
    { ...type, ...region, ...band(PRICE_BAND) },
    { ...type, ...band(PRICE_BAND) },
    { ...type, ...band(PRICE_BAND * 2) },
    {},
  ];
}

/** vectorFloor: the cosine similarity at which a model's matches stop being related; it maps to 0. */
export function rankSimilarUnits(
  seed: Unit,
  candidates: SimilarCandidate[],
  limit: number,
  vectorFloor = 0
): RankedUnit[] {
  const useVector = candidates.some((c) => c.similarity != null);
  const vectorScore = (similarity: number | null) =>
    similarity == null
      ? 0
      : Math.max(0, (similarity - vectorFloor) / (1 - vectorFloor));

  const ranked = candidates
    .map((c) => {
      const parts = [
        [WEIGHTS.price, closeness(c.unit.price, seed.price)],
        [WEIGHTS.area, closeness(c.unit.floorArea, seed.floorArea)],
        [
          WEIGHTS.fit,
          (bedsMatch(seed, c.unit) + locationMatch(seed, c.unit)) / 2,
        ],
      ];
      if (useVector) parts.push([WEIGHTS.vector, vectorScore(c.similarity)]);
      const weight = parts.reduce((sum, [w]) => sum + w, 0);
      const score = parts.reduce((sum, [w, s]) => sum + w * s, 0) / weight;
      return { unit: c.unit, score, reasons: reasons(seed, c.unit) };
    })
    .sort((a, b) => b.score - a.score);

  return diversify(ranked, limit);
}

/** At most `perProject` per compound first, then the rest by rank. */
export function diversify<T extends { unit: Unit }>(
  ranked: T[],
  limit: number,
  perProject = MAX_PER_PROJECT
): T[] {
  const counts = new Map<string, number>();
  const picked: T[] = [];
  const skipped: T[] = [];
  for (const r of ranked) {
    const count = counts.get(r.unit.projectId) ?? 0;
    if (count < perProject) {
      picked.push(r);
      counts.set(r.unit.projectId, count + 1);
    } else {
      skipped.push(r);
    }
  }
  return [...picked, ...skipped].slice(0, limit);
}

/** 1 when equal, falling linearly to 0 at a PRICE_BAND relative gap. */
function closeness(value: number, target: number): number {
  const t = Number(target);
  if (!(t > 0)) return 0;
  return Math.max(0, 1 - Math.abs(Number(value) - t) / (t * PRICE_BAND));
}

function bedsMatch(seed: Unit, unit: Unit): number {
  return 1 - Math.min(Math.abs(unit.rooms - seed.rooms), 2) / 2;
}

function locationMatch(seed: Unit, unit: Unit): number {
  if (unit.projectId === seed.projectId) return 1;
  const a = seed.project;
  const b = unit.project;
  if (!a || !b) return 0;
  if (a.area && a.area === b.area) return 0.75;
  if (a.city && a.city === b.city) return 0.5;
  if (a.region && a.region === b.region) return 0.25;
  return 0;
}

function reasons(seed: Unit, unit: Unit): string[] {
  const out: string[] = [];
  if (unit.projectId === seed.projectId) out.push('Same compound');
  else if (seed.project?.area && unit.project?.area === seed.project.area)
    out.push(`Also in ${seed.project.area}`);

  const seedPrice = Number(seed.price);
  if (seedPrice > 0) {
    const pct = Math.round(
      ((Number(unit.price) - seedPrice) / seedPrice) * 100
    );
    if (pct === 0) out.push('Same price');
    else out.push(pct < 0 ? `${-pct}% cheaper` : `${pct}% pricier`);
  }

  if (unit.rooms === seed.rooms && unit.rooms > 0)
    out.push(`${unit.rooms} bedrooms too`);
  else if (closeness(unit.floorArea, seed.floorArea) >= 2 / 3)
    out.push('Similar size');

  return out.slice(0, 3);
}
