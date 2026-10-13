import { ConfigService } from '@nestjs/config';
import { BuyerEventType } from '../../common/enums/buyer-event-type';
import { ConciergeService } from './concierge.service';

const LOCATIONS = [
  { area: 'New Cairo', city: 'Cairo', region: 'East Cairo' },
  { area: 'Sheikh Zayed', city: 'Giza', region: 'West Cairo' },
];
const AMENITIES = [
  { id: 'a-school', name: 'Schools Nearby' },
  { id: 'a-pool', name: 'Swimming Pool' },
];
const UNIT = {
  id: 'u1',
  name: 'Apartment',
  rooms: 3,
  bathrooms: 2,
  floorArea: 150,
  price: 9_000_000,
  project: { name: 'P', area: 'New Cairo', developer: { name: 'D' } },
  images: [],
};

function setup() {
  const searchService = {
    understand: jest.fn(async ({ searchTerm, ...filter }) => ({
      text: searchTerm ?? '',
      filter,
    })),
    search: jest.fn(async () => ({ items: [UNIT], total: 1, facets: [] })),
  };
  const unitService = {
    findAllWithCount: jest.fn(async () => [[UNIT], 1]),
    findOne: jest.fn(async () => UNIT),
    findManyByIds: jest.fn(async () => [UNIT]),
    findSimilarUnits: jest.fn(async () => [
      { unit: UNIT, score: 0.9, reasons: ['Same area'] },
    ]),
  };
  const buyerService = {
    getProfile: jest.fn(async () => ({
      budgetMax: 10_000_000,
      areas: ['New Cairo'],
      propertyTypes: [],
      amenityIds: ['a-school', 'gone'],
    })),
    savedUnitIds: jest.fn(async () => ['u1']),
    updatePreferences: jest.fn(async () => undefined),
    recordEvent: jest.fn(async () => undefined),
  };
  const dataSource = {
    query: jest.fn(async (sql: string) =>
      sql.includes('projects') ? LOCATIONS : AMENITIES
    ),
  };
  const service = new ConciergeService(
    searchService as any,
    unitService as any,
    buyerService as any,
    dataSource as any,
    new ConfigService({})
  );
  return { service, searchService, unitService, buyerService };
}

describe('ConciergeService', () => {
  describe('searchUnits', () => {
    it('resolves names into hard filters and reports what it applied', async () => {
      const { service, searchService } = setup();
      const result = await service.searchUnits({
        query: 'family home',
        locations: ['zayed', 'Atlantis'],
        maxPrice: 10_000_000,
        amenities: ['schools'],
      });

      expect(searchService.search).toHaveBeenCalledWith({
        filter: expect.objectContaining({
          searchTerm: 'family home',
          areas: ['Sheikh Zayed'],
          amenityIds: ['a-school'],
          maxPrice: 10_000_000,
        }),
        limit: 6,
      });
      expect(result.units).toEqual([
        expect.objectContaining({ id: 'u1', price: 9_000_000 }),
      ]);
      expect(result.appliedFilters).toEqual({
        keywords: 'family home',
        areas: ['Sheikh Zayed'],
        maxPrice: 10_000_000,
        amenities: ['Schools Nearby'],
      });
      expect(result.unmatched).toEqual(['Atlantis']);
    });

    it('falls back to Postgres filters when the search index is down', async () => {
      const { service, searchService, unitService } = setup();
      searchService.search.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await service.searchUnits({
        query: 'garden',
        minRooms: 3,
        limit: 2,
      });

      expect(unitService.findAllWithCount).toHaveBeenCalledWith(
        expect.not.objectContaining({ searchTerm: expect.anything() }),
        undefined,
        2,
        0
      );
      expect(result.total).toBe(1);
    });
  });

  it('returns similar units with their reasons', async () => {
    const { service } = setup();
    expect(await service.similarUnits('u1')).toEqual([
      { unit: expect.objectContaining({ id: 'u1' }), reasons: ['Same area'] },
    ]);
  });

  it('shows preferences with amenity names, dropping unknown IDs', async () => {
    const { service } = setup();
    expect(await service.getPreferences('b1')).toEqual(
      expect.objectContaining({
        budgetMax: 10_000_000,
        budgetMin: null,
        amenities: ['Schools Nearby'],
        savedUnitIds: ['u1'],
      })
    );
  });

  it('stores places as areas and amenities as IDs', async () => {
    const { service, buyerService } = setup();
    const result = await service.updatePreferences('b1', {
      budgetMax: 8_000_000,
      locations: ['West Cairo', 'Mars'],
      amenities: ['pool'],
    });

    expect(buyerService.updatePreferences).toHaveBeenCalledWith('b1', {
      budgetMax: 8_000_000,
      areas: ['Sheikh Zayed'],
      amenityIds: ['a-pool'],
    });
    expect(result.unmatched).toEqual(['Mars']);
  });

  it('leaves lists alone when they are not sent', async () => {
    const { service, buyerService } = setup();
    await service.updatePreferences('b1', { minRooms: 3 });
    expect(buyerService.updatePreferences).toHaveBeenCalledWith('b1', {
      minRooms: 3,
    });
  });

  it('saves a unit as a buyer save event', async () => {
    const { service, buyerService } = setup();
    await service.saveUnit('b1', 'u1');
    expect(buyerService.recordEvent).toHaveBeenCalledWith(
      'b1',
      'u1',
      BuyerEventType.SAVE
    );
  });
});
