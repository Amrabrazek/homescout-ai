import { Project } from '../projects/types';
import type { PropertyType } from '../buyer/types';

export type Finishing =
  'CORE_SHELL' | 'SEMI_FINISHED' | 'FULLY_FINISHED' | 'FURNISHED';

export type UnitView = 'GARDEN' | 'SEA' | 'POOL' | 'CITY' | 'STREET';

export interface Amenity {
  id: string;
  name: string;
  icon: string;
}

export interface Image {
  id: string;
  url: string;
  altText?: string;
}

export interface Unit {
  id: string;
  name: string;
  number: string;
  floor: number;
  rooms: number;
  bathrooms: number;
  floorArea: number;
  price: number;
  description?: string;
  createdAt: string;
  propertyType?: PropertyType | null;
  finishing?: Finishing | null;
  view?: UnitView | null;
  /** Null means ready to move. */
  deliveryYear?: number | null;
  downPaymentPct?: number | null;
  installmentYears?: number | null;
  /** Only on the unit page query. Null for units without plan data. */
  planValue?: PlanValue | null;
  project: Project;
  amenities: Amenity[];
  images: Image[];
}

export interface PlanValue {
  /** The plan's payments in today's money. */
  presentValue: number;
  /** presentValue / price, 0..1. */
  shareOfPrice: number;
  /** Yearly rate, e.g. 0.2. */
  discountRate: number;
}

export interface FacetCountValue {
  value: string;
  count: number;
}

export interface FacetStatsValue {
  min?: number;
  max?: number;
  avg?: number;
  sum?: number;
}

export interface FacetCount {
  field_name: string;
  counts: FacetCountValue[];
  stats?: FacetStatsValue;
}

export interface UnitFilter {
  searchTerm?: string;
  /** Filter groups parsed from searchTerm that the buyer removed, e.g. ["place"]. */
  ignoreParsed?: string[];
  projectIds?: string[];
  amenityIds?: string[];
  minRooms?: number;
  maxRooms?: number;
  minPrice?: number;
  maxPrice?: number;
  minFloorArea?: number;
  maxFloorArea?: number;
}

export enum UnitSortField {
  DEFAULT = 'DEFAULT',
  NAME = 'NAME',
  CREATED_AT = 'CREATED_AT',
  PRICE = 'PRICE',
}

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface UnitSort {
  field?: UnitSortField;
  direction?: SortDirection;
}

export interface UnitsResponse {
  items: Unit[];
  total: number;
  facets?: FacetCount[];
  __typename?: string;
}

export interface GetUnitsQueryResponse {
  units: UnitsResponse;
}

export interface SearchUnitsQueryResponse {
  searchUnits: UnitsResponse;
}

export interface GetUnitsQueryVariables {
  filter?: UnitFilter;
  sort?: UnitSort;
  limit?: number;
  offset?: number;
}

export interface GetUnitQueryResponse {
  unit: Unit;
}

export interface GetUnitQueryVariables {
  id: string;
}

export interface SimilarUnit {
  unit: Unit;
  score: number;
  /** Match % for the buyer; null for anonymous calls. */
  matchScore: number | null;
  reasons: string[];
}

export interface GetSimilarUnitsQueryResponse {
  similarUnits: SimilarUnit[];
}

export interface SimilarUnitsQueryVariables {
  unitId: string;
  limit?: number;
}

// Add interfaces for facet counts query
export interface SearchFacetsResponse {
  searchFacets: {
    facets: FacetCount[];
    total: number;
  };
}

export interface SearchFacetsQueryVariables {
  filter?: UnitFilter;
}

// SearchUnit types that match our backend SearchUnitDocument
export interface SearchUnit {
  id: string;
  name: string;
  number: string;
  floor: number;
  rooms: number;
  bathrooms: number;
  floorArea: number;
  price: number;
  description?: string;
  createdAt: string;
  project: {
    id: string;
    name: string;
    developer: {
      name: string;
    };
  };
  amenities: Amenity[];
  images: Image[];
}

// Update the SearchUnitsResponse to use SearchUnit
export interface SearchUnitsResponse {
  items: SearchUnit[];
  total: number;
  facets?: FacetCount[];
  __typename?: string;
}

export interface TypesenseSearchResponse {
  searchUnits: SearchUnitsResponse;
}

export interface ParsedSearch {
  text: string;
  minRooms?: number | null;
  maxRooms?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  minFloorArea?: number | null;
  maxFloorArea?: number | null;
  minFloor?: number | null;
  maxFloor?: number | null;
  areas?: string[] | null;
  cities?: string[] | null;
  regions?: string[] | null;
  propertyTypes?: string[] | null;
  excludeAmenities?: string[] | null;
  /** Groups the LLM set rather than the rules, e.g. ["place"]: shown as guesses. */
  guessed: string[];
}
