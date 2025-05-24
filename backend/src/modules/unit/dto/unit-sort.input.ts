import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';

export enum UnitSortField {
  DEFAULT = 'DEFAULT',
  NAME = 'name',
  CREATED_AT = 'createdAt',
  PRICE = 'price',
}

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(UnitSortField, {
  name: 'UnitSortField',
  description: 'Fields that can be used to sort units',
});

registerEnumType(SortDirection, {
  name: 'SortDirection',
  description: 'Sort direction (ascending or descending)',
});

@InputType()
export class UnitSortInput {
  @Field(() => UnitSortField, {
    nullable: true,
    defaultValue: UnitSortField.CREATED_AT,
    description: 'Field to sort by',
  })
  @IsEnum(UnitSortField)
  @IsOptional()
  field?: UnitSortField;

  @Field(() => SortDirection, {
    nullable: true,
    defaultValue: SortDirection.DESC,
    description: 'Sort direction',
  })
  @IsEnum(SortDirection)
  @IsOptional()
  direction?: SortDirection;
}
