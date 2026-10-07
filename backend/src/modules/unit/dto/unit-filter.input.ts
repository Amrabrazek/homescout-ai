import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

@InputType()
export class UnitFilterInput {
  @Field({
    nullable: true,
    description: 'Search term to match against unit name or number',
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
}
