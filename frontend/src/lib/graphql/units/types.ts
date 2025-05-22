import { Project } from '../projects/types';

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
  project: Project;
  amenities: Amenity[];
  images: Image[];
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
