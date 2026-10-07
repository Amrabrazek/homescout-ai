import { Field, Float, InputType, Int } from '@nestjs/graphql';
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
export class CreateUnitInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  number: string;

  @Field(() => Int)
  @IsNumber()
  @Min(0)
  floor: number;

  @Field(() => Int)
  @IsNumber()
  @IsPositive()
  rooms: number;

  @Field(() => Int)
  @IsNumber()
  @IsPositive()
  bathrooms: number;

  @Field(() => Float)
  @IsNumber()
  @IsPositive()
  floorArea: number;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => Float)
  @IsNumber()
  @IsPositive()
  price: number;

  @Field()
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @Field(() => [String], { nullable: true })
  @IsUUID('all', { each: true })
  @IsOptional()
  amenityIds?: string[];

  @Field(() => [String], { nullable: true })
  @IsUUID('all', { each: true })
  @IsOptional()
  imageIds?: string[];
}
