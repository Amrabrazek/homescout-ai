import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { Amenity } from './amenity.entity';
import { Image } from './image.entity';
import { UnitImage } from './unit-image.entity';
import { Finishing, PropertyType, UnitView } from '../enums/unit-attributes';

@ObjectType()
@Entity('units')
export class Unit {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  name: string;

  @Field()
  @Column()
  number: string;

  @Field(() => Int)
  @Column()
  floor: number;

  @Field(() => Int)
  @Column()
  rooms: number;

  @Field(() => Int)
  @Column()
  bathrooms: number;

  @Field(() => Float)
  @Column('decimal', { name: 'floor_area', precision: 10, scale: 2 })
  floorArea: number;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  description?: string;

  @Field(() => Float)
  @Column('decimal', { precision: 14, scale: 2 })
  price: number;

  @Field(() => PropertyType, { nullable: true })
  @Column('text', { name: 'property_type', nullable: true })
  propertyType?: PropertyType;

  @Field(() => Finishing, { nullable: true })
  @Column('text', { nullable: true })
  finishing?: Finishing;

  @Field(() => Int, {
    nullable: true,
    description: 'Expected delivery year; null means ready to move',
  })
  @Column('int', { name: 'delivery_year', nullable: true })
  deliveryYear?: number;

  @Field(() => Float, { nullable: true })
  @Column('decimal', {
    name: 'down_payment_pct',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  downPaymentPct?: number;

  @Field(() => Int, { nullable: true })
  @Column('int', { name: 'installment_years', nullable: true })
  installmentYears?: number;

  @Field(() => UnitView, { nullable: true })
  @Column('text', { nullable: true })
  view?: UnitView;

  @Field()
  @Column({ name: 'project_id' })
  projectId: string;

  @Field(() => Project)
  @ManyToOne(() => Project, (project) => project.units)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Field(() => [Amenity], { nullable: true })
  @ManyToMany(() => Amenity, (amenity) => amenity.units)
  @JoinTable({
    name: 'unit_amenities',
    joinColumn: { name: 'unit_id' },
    inverseJoinColumn: { name: 'amenity_id' },
  })
  amenities?: Amenity[];

  @Field(() => [UnitImage], { nullable: true })
  @OneToMany(() => UnitImage, (unitImage) => unitImage.unit)
  unitImages?: UnitImage[];

  @Field(() => [Image], { nullable: true })
  @ManyToMany(() => Image, (image) => image.units)
  @JoinTable({
    name: 'unit_images',
    joinColumn: { name: 'unit_id' },
    inverseJoinColumn: { name: 'image_id' },
  })
  images?: Image[];

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
