import { SearchResolver } from './search.resolver';
import { SearchService } from './search.service';

describe('SearchResolver.understandSearch', () => {
  it('returns the filters parsed from the search term', async () => {
    const understand = jest.fn().mockResolvedValue({
      text: 'garden',
      filter: { areas: ['New Cairo'], minRooms: 3, maxRooms: 3, maxPrice: 8e6 },
      guessed: ['place'],
    });
    const resolver = new SearchResolver({
      understand,
    } as unknown as SearchService);

    await expect(
      resolver.understandSearch('3 bed garden in new cairo under 8M', ['type'])
    ).resolves.toEqual({
      text: 'garden',
      minRooms: 3,
      maxRooms: 3,
      minPrice: undefined,
      maxPrice: 8e6,
      areas: ['New Cairo'],
      cities: undefined,
      regions: undefined,
      propertyTypes: undefined,
      guessed: ['place'],
    });
    expect(understand).toHaveBeenCalledWith({
      searchTerm: '3 bed garden in new cairo under 8M',
      ignoreParsed: ['type'],
    });
  });
});
