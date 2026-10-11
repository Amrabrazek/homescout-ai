import { BuyerProfile } from '../../common/entities/buyer-profile.entity';
import { Unit } from '../../common/entities/unit.entity';
import { PropertyType } from '../../common/enums/unit-attributes';
import {
  BuyerSignals,
  hasStatedPreferences,
  preferenceTiers,
  rankMatches,
  scoreMatch,
  toMatchPercent,
  varied,
} from './match-score';

let next = 0;
const unit = (overrides: Partial<Unit> = {}): Unit =>
  ({
    id: `u${next++}`,
    projectId: `p${next}`,
    project: { area: 'New Cairo' },
    price: 5_000_000,
    floorArea: 150,
    rooms: 3,
    propertyType: PropertyType.APARTMENT,
    amenities: [],
    ...overrides,
  }) as Unit;

const profile = (overrides: Partial<BuyerProfile> = {}): BuyerProfile =>
  ({
    id: 'b1',
    areas: [],
    propertyTypes: [],
    amenityIds: [],
    ...overrides,
  }) as BuyerProfile;

const signals = (p: Partial<BuyerProfile> = {}, saves = 0): BuyerSignals => ({
  profile: profile(p),
  saves,
});

describe('scoreMatch', () => {
  it('gives 100% and plain reasons when every stated preference is met', () => {
    const match = scoreMatch(
      signals({ budgetMax: 6_000_000, areas: ['New Cairo'], minRooms: 3 }),
      { unit: unit(), tasteSimilarity: null }
    );
    expect(toMatchPercent(match.score)).toBe(100);
    expect(match.hardMiss).toBe(false);
    expect(match.reasons).toEqual([
      'In your budget',
      'In New Cairo',
      '3 bedrooms as you wanted',
    ]);
  });

  it('halves the score of a unit outside the buyer’s areas', () => {
    const s = signals({ areas: ['Sheikh Zayed'], budgetMax: 6_000_000 });
    const miss = scoreMatch(s, { unit: unit(), tasteSimilarity: null });
    expect(miss.hardMiss).toBe(true);
    expect(miss.score).toBeCloseTo(0.25);
    expect(miss.reasons).toEqual(['In your budget']);
  });

  it('fades the budget check out 20% over budget', () => {
    const s = signals({ budgetMax: 5_000_000 });
    const score = (price: number) =>
      scoreMatch(s, { unit: unit({ price }), tasteSimilarity: null }).score;
    expect(score(5_000_000)).toBe(1);
    expect(score(5_500_000)).toBeCloseTo(0.5);
    expect(score(6_000_000)).toBe(0);
  });

  it('maps taste similarity from the model floor to 1 and names saves', () => {
    const s = signals({}, 3);
    const close = scoreMatch(s, { unit: unit(), tasteSimilarity: 0.96 }, 0.8);
    const unrelated = scoreMatch(
      s,
      { unit: unit(), tasteSimilarity: 0.8 },
      0.8
    );
    expect(close.score).toBeCloseTo(0.8);
    expect(close.reasons).toEqual(['Similar to units you saved']);
    expect(unrelated.score).toBe(0);
    expect(unrelated.reasons).toEqual([]);
  });

  it('says "viewed" when the taste comes from views only', () => {
    const match = scoreMatch(signals({}, 0), {
      unit: unit(),
      tasteSimilarity: 1,
    });
    expect(match.reasons).toEqual(['Like units you viewed']);
  });

  it('scores amenity overlap and names the ones the unit has', () => {
    const pool = { id: 'a1', name: 'Swimming Pool' };
    const match = scoreMatch(signals({ amenityIds: ['a1', 'a2'] }), {
      unit: unit({ amenities: [pool] as Unit['amenities'] }),
      tasteSimilarity: null,
    });
    expect(match.score).toBe(0.5);
    expect(match.reasons).toEqual(['Has swimming pool']);
  });

  it('keeps location, beds and size out of the personal reasons', () => {
    const match = scoreMatch(
      signals({ budgetMax: 6_000_000, areas: ['New Cairo'], minRooms: 2 }, 1),
      { unit: unit(), tasteSimilarity: 1 }
    );
    expect(match.personalReasons).toEqual([
      'Similar to units you saved',
      'In your budget',
    ]);
  });
});

describe('rankMatches', () => {
  it('moves units like the saved Zayed villas to the top', () => {
    const zayedVilla = unit({
      propertyType: PropertyType.VILLA,
      project: { area: 'Sheikh Zayed' } as Unit['project'],
    });
    const cairoFlat = unit();
    const ranked = rankMatches(
      signals({}, 3),
      [
        { unit: cairoFlat, tasteSimilarity: 0.84 },
        { unit: zayedVilla, tasteSimilarity: 0.97 },
      ],
      2,
      0.8
    );
    expect(ranked[0].unit).toBe(zayedVilla);
    expect(ranked[0].reasons).toContain('Similar to units you saved');
  });

  it('keeps at most two units per compound ahead of the rest', () => {
    const same = [1, 2, 3].map(() => unit({ projectId: 'same' }));
    const other = unit({ projectId: 'other', price: 9_000_000 });
    const ranked = rankMatches(
      signals({ budgetMax: 6_000_000 }),
      [...same, other].map((u) => ({ unit: u, tasteSimilarity: null })),
      3
    );
    expect(ranked.map((m) => m.unit)).toEqual([same[0], same[1], other]);
  });
});

describe('preferenceTiers', () => {
  it('drops size, then areas, then type, keeping the budget longest', () => {
    const tiers = preferenceTiers(
      profile({
        budgetMax: 8_000_000,
        areas: ['New Cairo'],
        propertyTypes: [PropertyType.VILLA],
        minRooms: 4,
      })
    );
    expect(tiers[0]).toEqual({
      maxPrice: 8_000_000,
      propertyTypes: ['villa'],
      areas: ['New Cairo'],
      minRooms: 4,
    });
    expect(tiers[1]).not.toHaveProperty('minRooms');
    expect(tiers[2]).not.toHaveProperty('areas');
    expect(tiers[3]).toEqual({ maxPrice: 8_000_000 });
    expect(tiers.at(-1)).toEqual({});
  });
});

describe('hasStatedPreferences', () => {
  it('is false for an empty profile and true once anything is set', () => {
    expect(hasStatedPreferences(profile())).toBe(false);
    expect(hasStatedPreferences(profile({ minRooms: 2 }))).toBe(true);
  });
});

describe('varied', () => {
  it('alternates property types and shows one unit per compound', () => {
    const flats = [1, 2, 3].map((i) => unit({ projectId: `f${i}` }));
    const villa = unit({ propertyType: PropertyType.VILLA, projectId: 'f1' });
    const chalet = unit({ propertyType: PropertyType.CHALET, projectId: 'c' });
    const picked = varied([...flats, villa, chalet], 4);
    expect(picked.map((u) => u.propertyType)).toEqual([
      'apartment',
      'chalet',
      'apartment',
      'apartment',
    ]);
    expect(new Set(picked.map((u) => u.projectId)).size).toBe(4);
  });
});
