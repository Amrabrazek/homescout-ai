import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PropertyType } from '../../../common/enums/unit-attributes';

export class SearchUnitsDto {
  @IsString()
  @MaxLength(300)
  @IsOptional()
  query?: string;

  @IsString({ each: true })
  @IsOptional()
  locations?: string[];

  @IsEnum(PropertyType, { each: true })
  @IsOptional()
  propertyTypes?: PropertyType[];

  @IsInt()
  @Min(0)
  @IsOptional()
  minRooms?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxRooms?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minFloorArea?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxFloorArea?: number;

  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  limit?: number;
}
