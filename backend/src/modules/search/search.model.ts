import { ObjectType, Field, Int, Float, ID } from '@nestjs/graphql';
import { FacetCount } from '../unit/unit.resolver';

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
