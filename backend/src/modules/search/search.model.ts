import { ObjectType, Field, Int, Float, ID } from '@nestjs/graphql';
import { FacetCount } from '../unit/unit.resolver';
import {
  Finishing,
  PropertyType,
  UnitView,
} from '../../common/enums/unit-attributes';

// Independent developer model for search results
@ObjectType()
export class SearchDeveloper {
  @Field()
  name: string;
}

// Independent project model for search results
@ObjectType()
export class SearchProject {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  area?: string;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  region?: string;

  @Field(() => SearchDeveloper)
  developer: SearchDeveloper;
}

// Independent amenity model for search results
@ObjectType()
export class SearchAmenity {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;
}

// Independent image model for search results
@ObjectType()
export class SearchImage {
  @Field()
  url: string;
}

// Main unit document model for search results
@ObjectType()
export class SearchUnitDocument {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  number: string;

  @Field(() => Int)
  floor: number;

  @Field(() => Int)
  rooms: number;

  @Field(() => Int)
  bathrooms: number;

  @Field(() => Float)
  floorArea: number;

  @Field(() => Float)
  price: number;

  @Field({ nullable: true })
  description?: string;

  @Field(() => PropertyType, { nullable: true })
  propertyType?: PropertyType;

  @Field(() => Finishing, { nullable: true })
  finishing?: Finishing;

  @Field(() => UnitView, { nullable: true })
  view?: UnitView;

  @Field(() => Int, { nullable: true })
  deliveryYear?: number;

  @Field()
  createdAt: Date;

  @Field(() => SearchProject)
  project: SearchProject;

  @Field(() => [SearchAmenity])
  amenities: SearchAmenity[];

  @Field(() => [SearchImage])
  images: SearchImage[];
}

// Search units response with facets
@ObjectType()
export class SearchUnitsResponse {
  @Field(() => [SearchUnitDocument])
  items: SearchUnitDocument[];

  @Field(() => Int)
  total: number;

  @Field(() => [FacetCount], { nullable: true })
  facets?: FacetCount[];
}

// Facet counts response
@ObjectType()
export class FacetCountResponse {
  @Field(() => [FacetCount], { nullable: true })
  facets: FacetCount[];

  @Field(() => Int)
  total: number;
}

@ObjectType()
export class ParsedSearch {
  @Field({ description: 'Words left for keyword and vector search' })
  text: string;

  @Field(() => Int, { nullable: true })
  minRooms?: number;

  @Field(() => Int, { nullable: true })
  maxRooms?: number;

  @Field(() => Float, { nullable: true })
  minPrice?: number;

  @Field(() => Float, { nullable: true })
  maxPrice?: number;

  @Field(() => [String], { nullable: true })
  areas?: string[];

  @Field(() => [String], { nullable: true })
  cities?: string[];

  @Field(() => [String], { nullable: true })
  regions?: string[];

  @Field(() => [PropertyType], { nullable: true })
  propertyTypes?: PropertyType[];
}
