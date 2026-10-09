import {
  expandToAreas,
  LocationRow,
  resolveAmenities,
  resolveLocations,
} from './vocabulary';

const rows: LocationRow[] = [
  { area: 'New Cairo', city: 'Cairo', region: 'East Cairo' },
  { area: 'Madinaty', city: 'Cairo', region: 'East Cairo' },
  { area: 'Sheikh Zayed', city: 'Giza', region: 'West Cairo' },
  { area: 'New Zayed', city: 'Giza', region: 'West Cairo' },
  { area: 'El Gouna', city: 'Hurghada', region: 'Red Sea' },
];

describe('resolveLocations', () => {
  it('prefers an exact area, city or region', () => {
    expect(resolveLocations(['new cairo', 'Giza', 'red sea'], rows)).toEqual({
      areas: ['New Cairo'],
      cities: ['Giza'],
      regions: ['Red Sea'],
      unknown: [],
    });
  });

  it('expands a partial name to every area containing it', () => {
    expect(resolveLocations(['Zayed'], rows).areas).toEqual([
      'Sheikh Zayed',
      'New Zayed',
    ]);
  });

  it('accepts small typos and reports what matched nothing', () => {
    const result = resolveLocations(['Madinty', 'Atlantis'], rows);
    expect(result.areas).toEqual(['Madinaty']);
    expect(result.unknown).toEqual(['Atlantis']);
  });

  it('does not match a word inside another word', () => {
    expect(resolveLocations(['Cai'], rows).unknown).toEqual(['Cai']);
  });
});

describe('expandToAreas', () => {
  it('turns cities and regions into their areas', () => {
    expect(
      expandToAreas(
        { areas: ['El Gouna'], cities: ['Giza'], regions: [] },
        rows
      ).sort()
    ).toEqual(['El Gouna', 'New Zayed', 'Sheikh Zayed']);
  });
});

describe('resolveAmenities', () => {
  const amenities = [
    { id: 'a1', name: 'Swimming Pool' },
    { id: 'a2', name: 'Schools Nearby' },
    { id: 'a3', name: 'Gym' },
  ];

  it('matches exact, partial and misspelled names once each', () => {
    expect(
      resolveAmenities(['gym', 'pool', 'Schools', 'Swiming Pool'], amenities)
    ).toEqual({ ids: ['a3', 'a1', 'a2'], unknown: [] });
  });

  it('reports unknown amenities', () => {
    expect(resolveAmenities(['Helipad'], amenities)).toEqual({
      ids: [],
      unknown: ['Helipad'],
    });
  });
});
