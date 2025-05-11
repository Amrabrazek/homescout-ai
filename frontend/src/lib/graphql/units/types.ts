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
