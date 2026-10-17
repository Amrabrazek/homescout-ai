import { PropertyType } from '../../common/enums/unit-attributes';
import { compileUnitFilter } from './unit-filter';

describe('compileUnitFilter', () => {
  it('matches everything when there is no filter', () => {
    expect(compileUnitFilter()).toEqual({
      sql: { where: 'TRUE', params: {} },
      typesense: '',
    });
  });

  it('builds the same constraints for SQL and Typesense', () => {
    const { sql, typesense } = compileUnitFilter({
      areas: ['New Cairo'],
      propertyTypes: [PropertyType.APARTMENT],
      minRooms: 3,
      maxRooms: 3,
      maxPrice: 8_000_000,
    });

    expect(sql.where).toBe(
      '"project"."area" IN (:...f0) AND "unit"."property_type" IN (:...f1) AND ' +
        '"unit"."rooms" >= :f2 AND "unit"."rooms" <= :f3 AND "unit"."price" <= :f4'
    );
    expect(sql.params).toEqual({
      f0: ['New Cairo'],
      f1: ['apartment'],
      f2: 3,
      f3: 3,
      f4: 8_000_000,
    });
    expect(typesense).toBe(
      'area:=[`New Cairo`] && propertyType:=[`apartment`] && rooms:[3..3] && price:<=8000000'
    );
  });

  it('filters by floor', () => {
    const { sql, typesense } = compileUnitFilter({ minFloor: 1 });
    expect(sql.where).toBe('"unit"."floor" >= :f0');
    expect(typesense).toBe('floor:>=1');
  });

  it('matches a unit in any of the places when they are of different kinds', () => {
    const { sql, typesense } = compileUnitFilter({
      areas: ['New Cairo'],
      regions: ['West Cairo'],
      maxPrice: 50_000_000,
    });
    expect(sql.where).toBe(
      '("project"."area" IN (:...f0) OR "project"."region" IN (:...f1)) AND "unit"."price" <= :f2'
    );
    expect(typesense).toBe(
      '(area:=[`New Cairo`] || region:=[`West Cairo`]) && price:<=50000000'
    );
  });

  it('requires every selected amenity', () => {
    const { sql, typesense } = compileUnitFilter({ amenityIds: ['a', 'b'] });
    expect(sql.where).toContain('HAVING COUNT(DISTINCT amenity_id) = :f1');
    expect(sql.params).toEqual({ f0: ['a', 'b'], f1: 2 });
    expect(typesense).toBe('amenityIds:=`a` && amenityIds:=`b`');
  });

  it('excludes units that have any of the excluded amenities', () => {
    const { sql, typesense } = compileUnitFilter({
      excludeAmenities: ['Swimming Pool', 'Gym'],
    });
    expect(sql.where).toContain('"unit"."id" NOT IN');
    expect(sql.params).toEqual({ f0: ['Swimming Pool', 'Gym'] });
    expect(typesense).toBe('amenityNames:!=[`Swimming Pool`,`Gym`]');
  });

  it('keeps free text out of filter_by and strips backticks from values', () => {
    const { sql, typesense } = compileUnitFilter({
      searchTerm: 'villa',
      areas: ['Bad`Name'],
    });
    expect(sql.where).toContain('ILIKE :f0');
    expect(typesense).toBe('area:=[`BadName`]');
  });
});
