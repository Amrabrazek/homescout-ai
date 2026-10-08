import { Unit } from '../../common/entities/unit.entity';
import { Finishing, PropertyType } from '../../common/enums/unit-attributes';
import { buildUnitEmbeddingText, contentHash } from './unit-embedding-text';

const unit = {
  name: '3-Bedroom Apartment',
  rooms: 3,
  bathrooms: 2,
  floorArea: '150.00',
  floor: 4,
  price: '9500000.00',
  propertyType: PropertyType.APARTMENT,
  finishing: Finishing.SEMI_FINISHED,
  deliveryYear: null,
  description: 'Bright corner unit.',
  project: {
    name: 'Hyde Park',
    area: 'New Cairo',
    city: 'Cairo',
    region: 'East Cairo',
    developer: { name: 'Hyde Park Developments' },
  },
  amenities: [{ name: 'Swimming Pool' }, { name: 'Clubhouse' }],
} as unknown as Unit;

describe('buildUnitEmbeddingText', () => {
  it('describes the unit from its attributes', () => {
    expect(buildUnitEmbeddingText(unit)).toBe(
      [
        '3-Bedroom Apartment',
        'Type: apartment',
        'Project: Hyde Park',
        'Developer: Hyde Park Developments',
        'Location: New Cairo, Cairo, East Cairo',
        '3 bedrooms, 2 bathrooms, 150 m², floor 4',
        'Price: 9500000 EGP',
        'Finishing: semi finished',
        'Ready to move',
        'Amenities: Clubhouse, Swimming Pool',
        'Bright corner unit.',
      ].join('\n')
    );
  });

  it('hashes independently of amenity order', () => {
    const reordered = {
      ...unit,
      amenities: [...unit.amenities].reverse(),
    } as Unit;
    expect(contentHash(buildUnitEmbeddingText(reordered))).toBe(
      contentHash(buildUnitEmbeddingText(unit))
    );
  });
});
