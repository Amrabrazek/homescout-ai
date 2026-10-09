import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PropertyType } from '../../../common/enums/unit-attributes';

/** Like UpdatePreferencesInput, but places and amenities are given by name. */
export class UpdateBuyerPreferencesDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  budgetMin?: number | null;

  @IsNumber()
  @Min(0)
  @IsOptional()
  budgetMax?: number | null;

  @IsString({ each: true })
  @IsOptional()
  locations?: string[];

  @IsEnum(PropertyType, { each: true })
  @IsOptional()
  propertyTypes?: PropertyType[];

  @IsInt()
  @Min(0)
  @IsOptional()
  minRooms?: number | null;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minSize?: number | null;

  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];
}
