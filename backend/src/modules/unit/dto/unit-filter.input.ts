import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PropertyType } from '../../../common/enums/unit-attributes';

@InputType()
export class UnitFilterInput {
  @Field({
    nullable: true,
    description:
      'Free text. Search parses rooms, price and location out of it (e.g. "New Cairo 3 bedrooms under 8M")',
  })
  @IsString()
  @IsOptional()
  searchTerm?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Filter by multiple project IDs',
  })
  @IsUUID('all', { each: true })
  @IsOptional()
  projectIds?: string[];

  @Field(() => [String], { nullable: true })
  @IsUUID('all', { each: true })
  @IsOptional()
  amenityIds?: string[];

  @Field(() => [String], {
    nullable: true,
    description: 'Amenity names a unit must not have (e.g. "no pool")',
  })
  @IsString({ each: true })
  @IsOptional()
  excludeAmenities?: string[];

  @Field(() => [String], { nullable: true })
  @IsString({ each: true })
  @IsOptional()
  areas?: string[];

  @Field(() => [String], { nullable: true })
  @IsString({ each: true })
  @IsOptional()
  cities?: string[];

  @Field(() => [String], { nullable: true })
  @IsString({ each: true })
  @IsOptional()
  regions?: string[];

  @Field(() => [PropertyType], { nullable: true })
  @IsEnum(PropertyType, { each: true })
  @IsOptional()
  propertyTypes?: PropertyType[];

  @Field(() => Int, { nullable: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minRooms?: number;

  @Field(() => Int, { nullable: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxRooms?: number;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minFloorArea?: number;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxFloorArea?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Lowest floor (0 = ground)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minFloor?: number;

  @Field(() => Int, { nullable: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxFloor?: number;
}
