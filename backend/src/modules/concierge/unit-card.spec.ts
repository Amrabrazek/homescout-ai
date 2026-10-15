import { PropertyType } from '../../common/enums/unit-attributes';
import { toUnitCard, toUnitDetail, UnitLike } from './unit-card';

const unit: UnitLike = {
  id: 'u1',
  name: '3-Bedroom Apartment',
  rooms: 3,
  bathrooms: 2,
  floorArea: '165.00',
  price: '8970000.00',
  floor: 4,
  description: 'x'.repeat(700),
  propertyType: PropertyType.APARTMENT,
  deliveryYear: 2027,
  project: {
    name: 'Mountain View',
    area: 'New Cairo',
    city: 'Cairo',
    developer: { name: 'MV' },
  },
  amenities: [{ name: 'Gym' }],
  images: [{ url: 'https://img/1' }, { url: 'https://img/2' }],
};

describe('toUnitCard', () => {
  it('turns decimal strings into numbers and keeps the first image', () => {
    expect(toUnitCard(unit)).toEqual({
      id: 'u1',
      name: '3-Bedroom Apartment',
      project: 'Mountain View',
      developer: 'MV',
      area: 'New Cairo',
      city: 'Cairo',
      propertyType: 'apartment',
      rooms: 3,
      bathrooms: 2,
      floorArea: 165,
      price: 8970000,
      deliveryYear: 2027,
      imageUrl: 'https://img/1',
    });
  });

  it('copes with a unit without project or images', () => {
    const card = toUnitCard({ ...unit, project: null, images: [] });
    expect(card.project).toBeNull();
    expect(card.imageUrl).toBeNull();
  });
});

describe('toUnitDetail', () => {
  it('adds amenity names and a shortened description', () => {
    const detail = toUnitDetail(unit, 0.2);
    expect(detail.amenities).toEqual(['Gym']);
    expect(detail.description).toHaveLength(601);
    expect(detail.floor).toBe(4);
    expect(detail.paymentPlan).toBeNull();
  });

  it('adds the payment plan and its value today', () => {
    const detail = toUnitDetail(
      { ...unit, downPaymentPct: '10.00', installmentYears: 8 },
      0.2
    );
    expect(detail.paymentPlan).toMatchObject({
      downPaymentPct: 10,
      installmentYears: 8,
      months: 96,
      discountRate: 0.2,
    });
    expect(detail.paymentPlan.shareOfPrice).toBeCloseTo(0.547, 2);
  });

  it('keeps the plan but drops its value when the flag is off', () => {
    const detail = toUnitDetail(
      { ...unit, downPaymentPct: '10.00', installmentYears: 8 },
      null
    );
    expect(detail.paymentPlan).toMatchObject({
      downPaymentPct: 10,
      months: 96,
      presentValue: null,
      shareOfPrice: null,
      discountRate: null,
    });
    expect(detail.paymentPlan.monthlyInstallment).toBeGreaterThan(0);
  });
});
