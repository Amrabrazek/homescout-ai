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

  it('does not swallow a number next to a place name', () => {
    expect(parseSearchQuery('fe new cairo 3 owad', vocabulary)).toEqual({
      text: 'fe 3 owad',
      filter: { areas: ['New Cairo'] },
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
    expect(parseSearchQuery('building 3 sea view', vocabulary)).toEqual({
      text: 'building 3 sea view',
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

  it('parses messy price and type shorthand', () => {
    expect(parseSearchQuery('need 3 bdr apt max 7 mil', vocabulary)).toEqual({
      text: '',
      filter: {
        minRooms: 3,
        maxRooms: 3,
        maxPrice: 7_000_000,
        propertyTypes: ['apartment'],
      },
    });
    for (const q of ['villa 30m-40m', 'villa 30 to 40 million'])
      expect(parseSearchQuery(q, vocabulary).filter).toEqual({
        minPrice: 30_000_000,
        maxPrice: 40_000_000,
        propertyTypes: ['villa'],
      });
  });

  it('parses size in square metres without reading it as a price', () => {
    expect(
      parseSearchQuery('apartment 150 sqm or bigger', vocabulary).filter
    ).toEqual({ minFloorArea: 150, propertyTypes: ['apartment'] });
    expect(parseSearchQuery('over 200 m2 under 9m', vocabulary).filter).toEqual(
      { minFloorArea: 200, maxPrice: 9_000_000 }
    );
    expect(parseSearchQuery('less than 120 meters', vocabulary).filter).toEqual(
      { maxFloorArea: 120 }
    );
    expect(
      parseSearchQuery('200 meters from the beach', vocabulary).filter
    ).toEqual({});
  });

  it('parses floors, including "not ground floor"', () => {
    expect(
      parseSearchQuery('2 bed under 5 mil not ground floor', vocabulary)
    ).toEqual({
      text: '',
      filter: { minRooms: 2, maxRooms: 2, maxPrice: 5_000_000, minFloor: 1 },
    });
    expect(parseSearchQuery('ground floor with garden', vocabulary)).toEqual({
      text: 'garden',
      filter: { maxFloor: 0 },
    });
    expect(parseSearchQuery('high floor', vocabulary).filter).toEqual({
      minFloor: 5,
    });
    expect(parseSearchQuery('on the 3rd floor', vocabulary).filter).toEqual({
      minFloor: 3,
      maxFloor: 3,
    });
  });

  it('turns a negated amenity into an exclude filter', () => {
    const withAmenities = {
      ...vocabulary,
      amenities: ['Swimming Pool', 'Gym', 'Private Garden', 'Elevator'],
    };
    const parse = (q: string) => parseSearchQuery(q, withAmenities);

    expect(
      parse('im looking for something with a sea view without a pool')
    ).toEqual({
      text: 'sea view',
      filter: { excludeAmenities: ['Swimming Pool'] },
    });
    expect(parse('apartment no swimming pool near a park')).toEqual({
      text: 'park',
      filter: {
        propertyTypes: ['apartment'],
        excludeAmenities: ['Swimming Pool'],
      },
    });
    expect(parse('no pool or gym').filter.excludeAmenities).toEqual([
      'Swimming Pool',
      'Gym',
    ]);
    expect(parse('villa no pool new cairo').filter).toEqual({
      propertyTypes: ['villa'],
      areas: ['New Cairo'],
      excludeAmenities: ['Swimming Pool'],
    });
    expect(parse('apartment with no lift').filter.excludeAmenities).toEqual([
      'Elevator',
    ]);
  });

  it('leaves other negations to the LLM, with a fallback text without them', () => {
    const withAmenities = { ...vocabulary, amenities: ['Swimming Pool'] };
    const parse = (q: string) => parseSearchQuery(q, withAmenities);

    // The regex can't read a "not" after the noun; only the LLM can.
    expect(parse('villa, pool not needed')).toEqual({
      text: 'pool not needed',
      fallbackText: 'pool',
      filter: { propertyTypes: ['villa'] },
    });
    expect(parse('no garden view, near a park')).toEqual({
      text: 'no garden view, near a park',
      fallbackText: 'park',
      filter: {},
    });
    expect(parse('no noisy neighbours and a big garden')).toEqual({
      text: 'no noisy neighbours and a big garden',
      fallbackText: 'big garden',
      filter: {},
    });
  });

  it('reads "not a ground floor" and "no more than" the right way round', () => {
    expect(
      parseSearchQuery('not a ground floor apartment', vocabulary).filter
    ).toEqual({
      minFloor: 1,
      propertyTypes: ['apartment'],
    });
    expect(parseSearchQuery('except ground floor', vocabulary).filter).toEqual({
      minFloor: 1,
    });
    expect(
      parseSearchQuery('no more than 3 bedrooms', vocabulary).filter
    ).toEqual({
      maxRooms: 3,
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
