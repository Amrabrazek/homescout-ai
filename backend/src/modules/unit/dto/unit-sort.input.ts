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
    defaultValue: UnitSortField.DEFAULT,
    description:
      'Field to sort by; DEFAULT is relevance for text search, newest first otherwise',
  })
  @IsEnum(UnitSortField)
  @IsOptional()
  field?: UnitSortField;

  @Field(() => SortDirection, {
    nullable: true,
    description:
      'Sort direction; defaults to DESC for createdAt, ASC otherwise',
  })
  @IsEnum(SortDirection)
  @IsOptional()
  direction?: SortDirection;
}
