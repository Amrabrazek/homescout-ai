import {
  PropertyType,
  Region,
  UnitView,
} from '../../common/enums/unit-attributes';
import { AREAS } from './data';
import { DEFAULT_SEED, generateDataset } from './generate';
import {
  FINISHING_FACTOR,
  PRICE_NOISE,
  READY_FACTOR,
  SEA_VIEW_FACTOR,
  TYPE_SPECS,
} from './rules';

const HOUSES = [
  PropertyType.TOWNHOUSE,
  PropertyType.TWIN_HOUSE,
  PropertyType.VILLA,
];
const BUDGET_BANDS: [number, number][] = [
  [0, 3_000_000],
  [3_000_000, 7_000_000],
  [7_000_000, 15_000_000],
  [15_000_000, 40_000_000],
  [40_000_000, Infinity],
];

describe('seed generator', () => {
  const data = generateDataset(DEFAULT_SEED);
  const areaByName = new Map(AREAS.map((a) => [a.name, a]));
  const unitsWithArea = data.units.map((unit) => ({
    unit,
    project: data.projects[unit.project],
    area: areaByName.get(data.projects[unit.project].area),
  }));

  it('produces 2-3k units', () => {
    expect(data.units.length).toBeGreaterThanOrEqual(2000);
    expect(data.units.length).toBeLessThanOrEqual(3000);
  });

  it('is deterministic for a given seed', () => {
    expect(generateDataset(DEFAULT_SEED)).toEqual(data);
    expect(generateDataset(DEFAULT_SEED + 1).units).not.toEqual(data.units);
  });

  it('keeps size and rooms within the property type rules', () => {
    for (const { unit } of unitsWithArea) {
      const spec = TYPE_SPECS[unit.propertyType];
      expect(unit.floorArea).toBeGreaterThanOrEqual(spec.size[0]);
      expect(unit.floorArea).toBeLessThanOrEqual(spec.size[1]);
      expect(unit.rooms).toBeGreaterThanOrEqual(spec.rooms[0]);
      expect(unit.rooms).toBeLessThanOrEqual(spec.rooms[1]);
      expect(unit.bathrooms).toBeGreaterThanOrEqual(1);
      expect(unit.bathrooms).toBeLessThanOrEqual(unit.rooms + 1);
    }
  });

  it('prices every unit within its area band', () => {
    for (const { unit, area } of unitsWithArea) {
      const factors =
        TYPE_SPECS[unit.propertyType].priceFactor *
        FINISHING_FACTOR[unit.finishing] *
        (unit.view === UnitView.SEA ? SEA_VIEW_FACTOR : 1) *
        (unit.deliveryYear === null ? READY_FACTOR : 1);
      const basePerM2 = unit.price / unit.floorArea / factors;
      const rounding = 5_000 / unit.floorArea / factors;
      expect(basePerM2).toBeGreaterThanOrEqual(
        area.pricePerM2[0] * (1 - PRICE_NOISE) - rounding
      );
      expect(basePerM2).toBeLessThanOrEqual(
        area.pricePerM2[1] * (1 + PRICE_NOISE) + rounding
      );
    }
  });

  it('only puts houses on the ground floor and sea views on the coast', () => {
    for (const { unit, area } of unitsWithArea) {
      if (HOUSES.includes(unit.propertyType)) expect(unit.floor).toBe(0);
      if (unit.view === UnitView.SEA) expect(area.coastal).toBe(true);
      if (unit.propertyType === PropertyType.CHALET) {
        expect(area.vibe).toBe('beach');
      }
      if (unit.amenities.includes('Beach Access')) {
        expect(area.coastal).toBe(true);
      }
    }
  });

  it('matches payment plans to delivery status', () => {
    for (const { unit } of unitsWithArea) {
      if (unit.deliveryYear === null) {
        expect(unit.downPaymentPct).toBeGreaterThanOrEqual(20);
      } else {
        expect(unit.deliveryYear).toBeGreaterThan(2026);
        expect(unit.installmentYears).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it('covers every region, property type and budget band', () => {
    const regions = new Set(unitsWithArea.map(({ area }) => area.region));
    expect([...regions].sort()).toEqual(Object.values(Region).sort());

    const types = new Set(data.units.map((u) => u.propertyType));
    expect([...types].sort()).toEqual(Object.values(PropertyType).sort());

    for (const [min, max] of BUDGET_BANDS) {
      const inBand = data.units.filter((u) => u.price >= min && u.price < max);
      expect(inBand.length).toBeGreaterThan(50);
    }
  });

  it('references only known amenities and images', () => {
    const amenityNames = new Set(data.amenities.map((a) => a.name));
    for (const unit of data.units) {
      for (const name of unit.amenities)
        expect(amenityNames.has(name)).toBe(true);
      for (const img of unit.images) expect(data.images[img]).toBeDefined();
      expect(new Set(unit.images).size).toBe(unit.images.length);
    }
  });
});
