import { BuyerProfile } from '../../common/entities/buyer-profile.entity';
import { Unit } from '../../common/entities/unit.entity';
import { UnitFilterInput } from '../unit/dto/unit-filter.input';
import { diversify } from '../unit/similar-units';

/** One place to tune the feed. Parts the buyer gave no signal for drop out and the rest are renormalised. */
export const MATCH_CONFIG = {
  weights: { hard: 0.5, taste: 0.35, amenities: 0.15 },
  /** Multiplier when a unit fails a hard preference outright. */
  missPenalty: 0.5,
  /** Over budget (or under min size) by this share scores 0 on that check. */
  tolerance: 0.2,
  /** Taste loses this share of a unit's (rescaled) likeness to the closest skipped unit. */
  skipPenalty: 0.5,
  /** Normalised taste similarity at which "Similar to units you saved" shows. */
  tasteReason: 0.6,
  maxReasons: 3,
  maxPerProject: 2,
  /** Share of the personal match in a similar unit's rank; the rest is closeness to the unit. */
  similarMatchWeight: 0.3,
};

export interface BuyerSignals {
  profile: BuyerProfile;
  saves: number;
}

export interface MatchCandidate {
  unit: Unit;
  /** Cosine similarity to the buyer's taste vector, null without one. */
  tasteSimilarity: number | null;
  /** Highest cosine similarity to a unit the buyer skipped. */
  skipSimilarity?: number | null;
}

export interface Match {
  unit: Unit;
  /** 0 to 1. */
  score: number;
  reasons: string[];
  /** Reasons a similar-units list doesn't already give (it covers location, beds and size). */
  personalReasons: string[];
  hardMiss: boolean;
}

export function hasStatedPreferences(profile: BuyerProfile): boolean {
  return (
    profile.budgetMin != null ||
    profile.budgetMax != null ||
    profile.areas.length > 0 ||
    profile.propertyTypes.length > 0 ||
    profile.minRooms != null ||
    profile.minSize != null ||
    profile.amenityIds.length > 0
  );
}

/**
 * Candidate filters from strict to loose, like similarityTiers. Amenities are
 * a soft signal, so no tier filters on them.
 */
export function preferenceTiers(profile: BuyerProfile): UnitFilterInput[] {
  const budget = {
    ...(profile.budgetMin != null && { minPrice: profile.budgetMin }),
    ...(profile.budgetMax != null && { maxPrice: profile.budgetMax }),
  };
  const types = profile.propertyTypes.length
    ? { propertyTypes: profile.propertyTypes }
    : {};
  const areas = profile.areas.length ? { areas: profile.areas } : {};
  const size = {
    ...(profile.minRooms != null && { minRooms: profile.minRooms }),
    ...(profile.minSize != null && { minFloorArea: profile.minSize }),
  };
  return [
    { ...budget, ...types, ...areas, ...size },
    { ...budget, ...types, ...areas },
    { ...budget, ...types },
    budget,
    {},
  ];
}

/** vectorFloor: the cosine similarity at which a model's matches stop being related; it maps to 0. */
export function scoreMatch(
  signals: BuyerSignals,
  candidate: MatchCandidate,
  vectorFloor = 0
): Match {
  const { profile } = signals;
  const { unit } = candidate;
  const checks = hardChecks(profile, unit);

  const parts: [number, number][] = [];
  if (checks.length) {
    const hard = checks.reduce((sum, c) => sum + c.score, 0) / checks.length;
    parts.push([MATCH_CONFIG.weights.hard, hard]);
  }
  const rescale = (similarity: number) =>
    clamp01((similarity - vectorFloor) / (1 - vectorFloor));
  const taste =
    candidate.tasteSimilarity == null
      ? null
      : clamp01(
          rescale(candidate.tasteSimilarity) -
            MATCH_CONFIG.skipPenalty * rescale(candidate.skipSimilarity ?? 0)
        );
  if (taste != null) parts.push([MATCH_CONFIG.weights.taste, taste]);
  const wanted = profile.amenityIds;
  const has = (unit.amenities ?? []).filter((a) => wanted.includes(a.id));
  if (wanted.length) {
    parts.push([MATCH_CONFIG.weights.amenities, has.length / wanted.length]);
  }

  const weight = parts.reduce((sum, [w]) => sum + w, 0);
  const blended = weight
    ? parts.reduce((sum, [w, s]) => sum + w * s, 0) / weight
    : 0;
  const hardMiss = checks.some((c) => c.score === 0);
  const score = hardMiss ? blended * MATCH_CONFIG.missPenalty : blended;

  const reasons: { text: string; personal: boolean }[] = [];
  if (taste != null && taste >= MATCH_CONFIG.tasteReason) {
    reasons.push({
      text:
        signals.saves > 0
          ? 'Similar to units you saved'
          : 'Like units you viewed',
      personal: true,
    });
  }
  for (const c of checks) {
    if (c.score === 1 && c.reason)
      reasons.push({ text: c.reason, personal: !c.likeness });
  }
  for (const a of has)
    reasons.push({ text: `Has ${a.name.toLowerCase()}`, personal: true });

  return {
    unit,
    score,
    reasons: reasons.slice(0, MATCH_CONFIG.maxReasons).map((r) => r.text),
    personalReasons: reasons.filter((r) => r.personal).map((r) => r.text),
    hardMiss,
  };
}

export function rankMatches(
  signals: BuyerSignals,
  candidates: MatchCandidate[],
  limit: number,
  vectorFloor = 0
): Match[] {
  const ranked = candidates
    .map((c) => scoreMatch(signals, c, vectorFloor))
    .sort((a, b) => b.score - a.score);
  return diversify(ranked, limit, MATCH_CONFIG.maxPerProject);
}

/**
 * Cold start: units arrive most popular first; take them round-robin by
 * property type, one per compound, so the first screen isn't ten apartments.
 */
export function varied(units: Unit[], limit: number): Unit[] {
  const byType = new Map<string, Unit[]>();
  for (const unit of units) {
    const key = unit.propertyType ?? '';
    byType.set(key, [...(byType.get(key) ?? []), unit]);
  }
  const queues = [...byType.values()];
  const ordered: Unit[] = [];
  while (queues.some((q) => q.length)) {
    for (const q of queues) if (q.length) ordered.push(q.shift());
  }
  return diversify(
    ordered.map((unit) => ({ unit })),
    limit,
    1
  ).map((r) => r.unit);
}

/** Percent shown to the buyer. */
export const toMatchPercent = (score: number) =>
  Math.round(clamp01(score) * 100);

interface HardCheck {
  score: number;
  reason?: string;
  /** Location, beds or size: what similar units already compare. */
  likeness?: boolean;
}

function hardChecks(profile: BuyerProfile, unit: Unit): HardCheck[] {
  const checks: HardCheck[] = [];
  const price = Number(unit.price);
  const { tolerance } = MATCH_CONFIG;

  if (profile.budgetMax != null || profile.budgetMin != null) {
    const max = profile.budgetMax;
    const min = profile.budgetMin;
    if (max != null && price > max) {
      checks.push({ score: clamp01(1 - (price - max) / max / tolerance) });
    } else if (min != null && price < min) {
      checks.push({ score: 0.75 });
    } else {
      checks.push({ score: 1, reason: 'In your budget' });
    }
  }

  if (profile.areas.length) {
    const area = unit.project?.area;
    const met = !!area && profile.areas.includes(area);
    checks.push({
      score: met ? 1 : 0,
      reason: met ? `In ${area}` : undefined,
      likeness: true,
    });
  }

  if (profile.propertyTypes.length) {
    const met =
      !!unit.propertyType && profile.propertyTypes.includes(unit.propertyType);
    checks.push({
      score: met ? 1 : 0,
      reason: met
        ? `${capitalize(unit.propertyType)}, as you wanted`
        : undefined,
    });
  }

  if (profile.minRooms != null) {
    const short = profile.minRooms - unit.rooms;
    checks.push(
      short <= 0
        ? {
            score: 1,
            reason: `${unit.rooms} bedrooms as you wanted`,
            likeness: true,
          }
        : { score: short === 1 ? 0.5 : 0 }
    );
  }

  if (profile.minSize != null) {
    const size = Number(unit.floorArea);
    const short = (profile.minSize - size) / profile.minSize;
    checks.push(
      short <= 0
        ? {
            score: 1,
            reason: `${Math.round(size)} m², roomy enough`,
            likeness: true,
          }
        : { score: clamp01(1 - short / tolerance) }
    );
  }

  return checks;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
