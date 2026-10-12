import { PropertyType } from '../../common/enums/unit-attributes';
import { ExpectedFilter } from '../metrics';

/**
 * Search queries written the way buyers type them, with the hard filters a
 * person would expect. Follows the parser's documented conventions: "3 bedroom"
 * is exactly 3, a family of N needs N-2 bedrooms (at least 2), a bare size is a
 * minimum, "high floor" is floor 5 and up. Places are compared as one set, so
 * an area, city or region with the same name all count.
 */
export interface ParseCase {
  query: string;
  expected: ExpectedFilter;
  /** What makes it hard: shown in the report next to failures. */
  note: string;
}

const { APARTMENT, STUDIO, VILLA, CHALET, PENTHOUSE, TOWNHOUSE, TWIN_HOUSE } =
  PropertyType;
const M = 1_000_000;

export const PARSE_CASES: ParseCase[] = [
  {
    query: '3 bedroom apartment in New Cairo under 8m',
    expected: {
      propertyTypes: [APARTMENT],
      minRooms: 3,
      maxRooms: 3,
      places: ['New Cairo'],
      maxPrice: 8 * M,
    },
    note: 'clean',
  },
  {
    query: 'villa sheikh zayed 20-30 million',
    expected: {
      propertyTypes: [VILLA],
      places: ['Sheikh Zayed'],
      minPrice: 20 * M,
      maxPrice: 30 * M,
    },
    note: 'price range',
  },
  {
    query: 'chalet in ain sokhna below 5 million',
    expected: {
      propertyTypes: [CHALET],
      places: ['Ain Sokhna'],
      maxPrice: 5 * M,
    },
    note: 'clean',
  },
  {
    query: 'studio new capital',
    expected: {
      propertyTypes: [STUDIO],
      places: ['New Administrative Capital'],
    },
    note: 'short place name',
  },
  {
    query: '2-3 bedroom flat in madinaty',
    expected: {
      propertyTypes: [APARTMENT],
      minRooms: 2,
      maxRooms: 3,
      places: ['Madinaty'],
    },
    note: 'flat means apartment',
  },
  {
    query: 'penthouse 200 sqm or bigger fifth settlement',
    expected: {
      propertyTypes: [PENTHOUSE],
      minFloorArea: 200,
      places: ['Fifth Settlement'],
    },
    note: 'size',
  },
  {
    query: 'apartment not ground floor 6th of october',
    expected: {
      propertyTypes: [APARTMENT],
      minFloor: 1,
      places: ['6th of October'],
    },
    note: 'negated floor',
  },
  {
    query: 'twin house in new zayed between 15 and 20 million',
    expected: {
      propertyTypes: [TWIN_HOUSE],
      places: ['New Zayed'],
      minPrice: 15 * M,
      maxPrice: 20 * M,
    },
    note: 'between X and Y',
  },
  {
    query: 'townhouse el shorouk at least 4 bedrooms',
    expected: {
      propertyTypes: [TOWNHOUSE],
      minRooms: 4,
      places: ['El Shorouk'],
    },
    note: 'at least',
  },
  {
    query: 'apartment from 3 to 5 million mostakbal city',
    expected: {
      propertyTypes: [APARTMENT],
      minPrice: 3 * M,
      maxPrice: 5 * M,
      places: ['Mostakbal City'],
    },
    note: 'from X to Y',
  },
  {
    query: 'fe new cairo 3 owad',
    expected: { places: ['New Cairo'], minRooms: 3, maxRooms: 3 },
    note: 'Franco-Arabic rooms ("owad")',
  },
  {
    query: 'sha2a fel sahel ta7t 5 million',
    expected: {
      propertyTypes: [APARTMENT],
      places: ['North Coast'],
      maxPrice: 5 * M,
    },
    note: 'Franco-Arabic: apartment, North Coast, under',
  },
  {
    query: 'شقة في التجمع الخامس 3 غرف',
    expected: {
      propertyTypes: [APARTMENT],
      places: ['Fifth Settlement'],
      minRooms: 3,
      maxRooms: 3,
    },
    note: 'Arabic',
  },
  {
    query: 'فيلا في الساحل الشمالي',
    expected: { propertyTypes: [VILLA], places: ['North Coast'] },
    note: 'Arabic',
  },
  {
    query: 'family of 5 in sheikh zayed',
    expected: { minRooms: 3, places: ['Sheikh Zayed'] },
    note: 'family size → bedrooms',
  },
  {
    query: 'something near AUC for a family of 4, budget 7 million',
    expected: { minRooms: 2, places: ['New Cairo'], maxPrice: 7 * M },
    note: 'landmark + family size',
  },
  {
    query: 'chalet near marassi',
    expected: { propertyTypes: [CHALET], places: ['Sidi Abdel Rahman'] },
    note: 'landmark (Marassi)',
  },
  {
    query: 'near mall of arabia 2 bedrooms',
    expected: { places: ['6th of October'], minRooms: 2, maxRooms: 2 },
    note: 'landmark (Mall of Arabia)',
  },
  {
    query: 'high floor apartment new cairo 4M budget',
    expected: {
      propertyTypes: [APARTMENT],
      minFloor: 5,
      places: ['New Cairo'],
      maxPrice: 4 * M,
    },
    note: 'budget after the number',
  },
  {
    query: '3br in el gouna max 9 mil',
    expected: {
      minRooms: 3,
      maxRooms: 3,
      places: ['El Gouna'],
      maxPrice: 9 * M,
    },
    note: 'abbreviations',
  },
  {
    query: 'big villa with 5+ bedrooms over 50m',
    expected: { propertyTypes: [VILLA], minRooms: 5, minPrice: 50 * M },
    note: '"50m" is money here, not metres',
  },
  {
    query: 'ground floor flat with garden in madinaty',
    expected: {
      propertyTypes: [APARTMENT],
      maxFloor: 0,
      places: ['Madinaty'],
    },
    note: 'garden stays as text',
  },
  {
    query: 'apartment in new cairo or sheikh zayed under 10m',
    expected: {
      propertyTypes: [APARTMENT],
      places: ['New Cairo', 'Sheikh Zayed'],
      maxPrice: 10 * M,
    },
    note: 'two places',
  },
  {
    query: 'villa no pool in new zayed',
    expected: { propertyTypes: [VILLA], places: ['New Zayed'] },
    note: 'negation adds no filter',
  },
  {
    query: 'i want 2 rooms near the sea in hurghada less than 6 million',
    expected: {
      minRooms: 2,
      maxRooms: 2,
      places: ['Hurghada'],
      maxPrice: 6 * M,
    },
    note: 'chatty',
  },
  {
    query: 'studio fel new capital ta7t 3 mil',
    expected: {
      propertyTypes: [STUDIO],
      places: ['New Administrative Capital'],
      maxPrice: 3 * M,
    },
    note: 'Franco-Arabic "under"',
  },
  {
    query: 'penthouse 250m2+ in the fifth',
    expected: {
      propertyTypes: [PENTHOUSE],
      minFloorArea: 250,
      places: ['Fifth Settlement'],
    },
    note: 'nickname ("the fifth")',
  },
  {
    query: 'townhouse, 4 bedrooms, ras el hekma, 5m to 8m',
    expected: {
      propertyTypes: [TOWNHOUSE],
      minRooms: 4,
      maxRooms: 4,
      places: ['Ras El Hekma'],
      minPrice: 5 * M,
      maxPrice: 8 * M,
    },
    note: 'comma list',
  },
  {
    query: '3 bed apt 150 sqm in sokhna',
    expected: {
      propertyTypes: [APARTMENT],
      minRooms: 3,
      maxRooms: 3,
      minFloorArea: 150,
      places: ['Ain Sokhna'],
    },
    note: 'partial place name',
  },
  {
    query: 'chalet in sahel with 3 rooms under 15 million',
    expected: {
      propertyTypes: [CHALET],
      minRooms: 3,
      maxRooms: 3,
      places: ['North Coast'],
      maxPrice: 15 * M,
    },
    note: 'Sahel means North Coast',
  },
];
