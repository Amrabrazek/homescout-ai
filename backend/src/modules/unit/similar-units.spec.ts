import { Unit } from '../../common/entities/unit.entity';
import { PropertyType } from '../../common/enums/unit-attributes';
import { rankSimilarUnits, similarityTiers } from './similar-units';

let next = 0;
const unit = (overrides: Partial<Unit> = {}): Unit =>
  ({
    id: `u${next++}`,
    projectId: 'p1',
    project: { area: 'New Cairo', city: 'Cairo', region: 'East Cairo' },
    price: 5_000_000,
    floorArea: 150,
    rooms: 3,
    propertyType: PropertyType.APARTMENT,
    ...overrides,
  }) as Unit;

describe('similarityTiers', () => {
  it('goes from type + region + ±30% price down to no filter', () => {
    const tiers = similarityTiers(unit());
    expect(tiers[0]).toEqual({
      propertyTypes: ['apartment'],
      regions: ['East Cairo'],
      minPrice: 3_500_000,
      maxPrice: 6_500_000,
    });
    expect(tiers[1]).not.toHaveProperty('regions');
    expect(tiers[2]).toMatchObject({
      minPrice: 2_000_000,
      maxPrice: 8_000_000,
    });
    expect(tiers.at(-1)).toEqual({});
  });
});

describe('rankSimilarUnits', () => {
  const seed = unit({ projectId: 'seed' });

  it('breaks a vector tie on price closeness', () => {
    const close = unit({ projectId: 'a', price: 5_200_000 });
    const far = unit({ projectId: 'b', price: 6_400_000 });
    const ranked = rankSimilarUnits(
      seed,
      [
        { unit: far, similarity: 0.9 },
        { unit: close, similarity: 0.9 },
      ],
      2,
      0.8
    );
    expect(ranked.map((r) => r.unit)).toEqual([close, far]);
  });

  it('lets a much better vector match beat a slightly closer price', () => {
    const close = unit({ projectId: 'a', price: 5_100_000 });
    const vibe = unit({ projectId: 'b', price: 5_600_000 });
    const ranked = rankSimilarUnits(
      seed,
      [
        { unit: close, similarity: 0.82 },
        { unit: vibe, similarity: 0.97 },
      ],
      2,
      0.8
    );
    expect(ranked.map((r) => r.unit)).toEqual([vibe, close]);
  });

  it('treats similarity below the floor as unrelated', () => {
    const [r] = rankSimilarUnits(
      seed,
      [{ unit: unit({ projectId: 'seed' }), similarity: 0.5 }],
      1,
      0.8
    );
    expect(r.score).toBeCloseTo(0.5);
  });

  it('keeps at most two units per project when others are available', () => {
    const sameProject = [1, 2, 3].map(() => unit({ projectId: 'a' }));
    const other = unit({ projectId: 'b', price: 6_000_000 });
    const ranked = rankSimilarUnits(
      seed,
      [...sameProject, other].map((u) => ({ unit: u, similarity: null })),
      3
    );
    expect(ranked.map((r) => r.unit.projectId)).toEqual(['a', 'a', 'b']);
  });

  it('fills from the same project when nothing else is left', () => {
    const units = [1, 2, 3].map(() => unit({ projectId: 'a' }));
    const ranked = rankSimilarUnits(
      seed,
      units.map((u) => ({ unit: u, similarity: null })),
      3
    );
    expect(ranked).toHaveLength(3);
  });

  it('scores on attributes alone when there are no embeddings', () => {
    const [exact] = rankSimilarUnits(
      seed,
      [{ unit: unit({ projectId: 'seed' }), similarity: null }],
      1
    );
    expect(exact.score).toBeCloseTo(1);
  });

  it('explains each pick', () => {
    const [r] = rankSimilarUnits(
      seed,
      [
        {
          unit: unit({ projectId: 'seed', price: 4_600_000 }),
          similarity: 0.9,
        },
      ],
      1
    );
    expect(r.reasons).toEqual([
      'Same compound',
      '8% cheaper',
      '3 bedrooms too',
    ]);
  });
});
