import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

@InputType()
export class UpdateUnitInput {
  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @Field({ nullable: true })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @IsOptional()
  name?: string;

  @Field({ nullable: true })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  number?: string;

  @Field(() => Int, { nullable: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  floor?: number;

  @Field(() => Int, { nullable: true })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  rooms?: number;

  @Field(() => Int, { nullable: true })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  bathrooms?: number;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  floorArea?: number;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  @Field({ nullable: true })
  @IsUUID()
  @IsNotEmpty()
  @IsOptional()
  projectId?: string;

  @Field(() => [String], { nullable: true })
  @IsUUID('all', { each: true })
  @IsOptional()
  amenityIds?: string[];

  @Field(() => [String], { nullable: true })
  @IsUUID('all', { each: true })
  @IsOptional()
  imageIds?: string[];
}
