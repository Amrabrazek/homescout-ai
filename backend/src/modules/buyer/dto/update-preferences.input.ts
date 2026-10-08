import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PropertyType } from '../../../common/enums/unit-attributes';

@InputType({
  description: 'Only the fields sent are changed; send null to clear one',
})
export class UpdatePreferencesInput {
  @Field(() => Float, { nullable: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  budgetMin?: number | null;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  budgetMax?: number | null;

  @Field(() => [String], { nullable: true })
  @IsString({ each: true })
  @IsOptional()
  areas?: string[];

  @Field(() => [PropertyType], { nullable: true })
  @IsEnum(PropertyType, { each: true })
  @IsOptional()
  propertyTypes?: PropertyType[];

  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(0)
  @IsOptional()
  minRooms?: number | null;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minSize?: number | null;

  @Field(() => [String], { nullable: true })
  @IsUUID('all', { each: true })
  @IsOptional()
  amenityIds?: string[];
}
