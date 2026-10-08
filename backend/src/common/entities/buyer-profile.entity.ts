import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PropertyType } from '../enums/unit-attributes';

const numeric = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? null : Number(value)),
};

@ObjectType({
  description:
    'What the buyer told us (preferences) plus what we learned from their activity',
})
@Entity('buyer_profiles')
export class BuyerProfile {
  @Field(() => ID)
  @PrimaryColumn('uuid')
  id: string;

  @Field(() => Float, { nullable: true })
  @Column('decimal', {
    name: 'budget_min',
    precision: 14,
    scale: 2,
    nullable: true,
    transformer: numeric,
  })
  budgetMin?: number | null;

  @Field(() => Float, { nullable: true })
  @Column('decimal', {
    name: 'budget_max',
    precision: 14,
    scale: 2,
    nullable: true,
    transformer: numeric,
  })
  budgetMax?: number | null;

  @Field(() => [String])
  @Column('text', { array: true, default: () => "'{}'" })
  areas: string[];

  @Field(() => [PropertyType])
  @Column('text', {
    name: 'property_types',
    array: true,
    default: () => "'{}'",
  })
  propertyTypes: PropertyType[];

  @Field(() => Int, { nullable: true })
  @Column('int', { name: 'min_rooms', nullable: true })
  minRooms?: number | null;

  @Field(() => Float, { nullable: true })
  @Column('decimal', {
    name: 'min_size',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numeric,
  })
  minSize?: number | null;

  @Field(() => [String], { description: 'Amenity IDs' })
  @Column('uuid', { name: 'amenities', array: true, default: () => "'{}'" })
  amenityIds: string[];

  @Field({ nullable: true })
  @Column('text', { name: 'taste_model', nullable: true })
  tasteModel?: string | null;

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
