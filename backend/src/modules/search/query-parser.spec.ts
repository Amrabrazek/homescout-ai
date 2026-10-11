import { editDistance, parseSearchQuery } from './query-parser';

const vocabulary = {
  areas: ['New Cairo', 'Madinaty', 'Sheikh Zayed', 'El Gouna'],
  cities: ['Cairo', 'Giza', 'Hurghada'],
  regions: ['East Cairo', 'Red Sea'],
};

describe('parseSearchQuery', () => {
  it('turns a typo-laden query into hard filters', () => {
    expect(
      parseSearchQuery('New Ciaro 3 bedroms under 8M', vocabulary)
    ).toEqual({
      text: '',
      filter: {
        areas: ['New Cairo'],
        minRooms: 3,
        maxRooms: 3,
        maxPrice: 8_000_000,
      },
    });
  });

  it('keeps descriptive words for keyword and vector search', () => {
    expect(
      parseSearchQuery('family villa with a garden in sheikh zayd', vocabulary)
    ).toEqual({
      text: 'family garden',
      filter: { areas: ['Sheikh Zayed'], propertyTypes: ['villa'] },
    });
  });

  it.each([
    ['between 5 and 8.5 million', { minPrice: 5_000_000, maxPrice: 8_500_000 }],
    ['over 2,500,000 EGP', { minPrice: 2_500_000 }],
    ['below 900k', { maxPrice: 900_000 }],
    ['up to 12', { maxPrice: 12_000_000 }],
    [
      'between 10 and 15 million',
      { minPrice: 10_000_000, maxPrice: 15_000_000 },
    ],
  ])('parses prices in "%s"', (query, filter) => {
    expect(parseSearchQuery(query, vocabulary)).toEqual({ text: '', filter });
  });

  it.each(['2br', '2 bed', '2-bedroom', '2 rooms'])(
    'parses rooms in "%s"',
    (query) => {
      expect(parseSearchQuery(query, vocabulary).filter).toEqual({
        minRooms: 2,
        maxRooms: 2,
      });
    }
  );

  it.each([
    ['2-3 rooms', { minRooms: 2, maxRooms: 3 }],
    ['2 or 3 bedrooms', { minRooms: 2, maxRooms: 3 }],
    ['3 to 4 beds', { minRooms: 3, maxRooms: 4 }],
    ['3+ beds', { minRooms: 3 }],
    ['3 bedrooms or more', { minRooms: 3 }],
    ['at least 3 bedrooms', { minRooms: 3 }],
    ['up to 2 rooms', { maxRooms: 2 }],
  ])('parses room ranges in "%s"', (query, filter) => {
    expect(parseSearchQuery(query, vocabulary)).toEqual({ text: '', filter });
  });

  it('parses property types', () => {
    expect(
      parseSearchQuery('studio or serviced apartment', vocabulary)
    ).toEqual({
      text: '',
      filter: { propertyTypes: ['serviced_apartment', 'studio'] },
    });
  });

  it('does not treat other numbers or short words as hints', () => {
    expect(parseSearchQuery('floor 3 sea view', vocabulary)).toEqual({
      text: 'floor 3 sea view',
      filter: {},
    });
  });

  it('matches a place by its distinctive word', () => {
    expect(
      parseSearchQuery('villa in New Cairo or Zayed', {
        ...vocabulary,
        areas: [...vocabulary.areas, 'New Zayed'],
      })
    ).toEqual({
      text: '',
      filter: {
        propertyTypes: ['villa'],
        areas: ['New Cairo', 'Sheikh Zayed', 'New Zayed'],
      },
    });
    expect(parseSearchQuery('gouna chalet', vocabulary).filter).toEqual({
      propertyTypes: ['chalet'],
      areas: ['El Gouna'],
    });
  });

  it('does not treat generic place words as places', () => {
    expect(parseSearchQuery('sea view near the coast', vocabulary)).toEqual({
      text: 'sea view coast',
      filter: {},
    });
  });

  it('matches cities and regions as well as areas', () => {
    expect(parseSearchQuery('hurgada red sea', vocabulary).filter).toEqual({
      cities: ['Hurghada'],
      regions: ['Red Sea'],
    });
  });
});

describe('editDistance', () => {
  it('counts an adjacent swap as one edit', () => {
    expect(editDistance('ciaro', 'cairo')).toBe(1);
    expect(editDistance('kitten', 'sitting')).toBe(3);
  });
});
