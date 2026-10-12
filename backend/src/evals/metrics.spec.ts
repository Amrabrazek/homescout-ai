import { PropertyType } from '../common/enums/unit-attributes';
import { EvalUnit } from './eval-unit';
import {
  compareFilters,
  meetsPreferences,
  percentile,
  precisionAtK,
  toExpectedShape,
} from './metrics';

describe('toExpectedShape', () => {
  it('merges areas, cities and regions into one deduped places set', () => {
    expect(
      toExpectedShape({
        areas: ['Hurghada'],
        cities: ['Hurghada'],
        regions: ['Red Sea'],
        minRooms: 2,
        propertyTypes: [],
      })
    ).toEqual({ places: ['Hurghada', 'Red Sea'], minRooms: 2 });
  });
});

describe('compareFilters', () => {
  it('passes when every field matches, whatever the array order', () => {
    expect(
      compareFilters(
        { places: ['A', 'B'], maxPrice: 5 },
        { places: ['B', 'A'], maxPrice: 5 }
      ).pass
    ).toBe(true);
  });

  it('separates missing, wrong and extra fields', () => {
    expect(
      compareFilters(
        { minRooms: 3, maxPrice: 5, places: ['A'] },
        { minRooms: 2, places: ['A'], minFloor: 1 }
      )
    ).toEqual({
      pass: false,
      missing: ['maxPrice'],
      wrong: ['minRooms'],
      extra: ['minFloor'],
    });
  });
});

describe('precisionAtK', () => {
  it('scores only the first k ids', () => {
    expect(precisionAtK(['a', 'b', 'c'], (id) => id !== 'b', 2)).toBe(0.5);
  });

  it('divides by what came back when fewer than k did', () => {
    expect(precisionAtK(['a'], () => true, 10)).toBe(1);
    expect(precisionAtK([], () => true, 10)).toBeNull();
  });
});

describe('percentile', () => {
  it('uses the nearest rank', () => {
    const values = [5, 1, 4, 2, 3];
    expect(percentile(values, 50)).toBe(3);
    expect(percentile(values, 95)).toBe(5);
    expect(percentile([], 50)).toBeNull();
  });
});

describe('meetsPreferences', () => {
  const unit: EvalUnit = {
    id: 'u',
    propertyType: PropertyType.APARTMENT,
    price: 5_000_000,
    rooms: 3,
    floorArea: 140,
    finishing: null,
    view: null,
    deliveryYear: null,
    area: 'New Cairo',
    region: 'East Cairo',
    amenities: [],
  };

  it('needs every stated preference', () => {
    expect(
      meetsPreferences(unit, {
        propertyTypes: [PropertyType.APARTMENT],
        areas: ['New Cairo'],
        budgetMax: 6_000_000,
        minRooms: 3,
      })
    ).toBe(true);
    expect(meetsPreferences(unit, { budgetMax: 4_000_000 })).toBe(false);
    expect(meetsPreferences(unit, { minSize: 150 })).toBe(false);
  });
});
