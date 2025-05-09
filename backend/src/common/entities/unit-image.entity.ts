import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Unit } from './unit.entity';
import { Image } from './image.entity';

@ObjectType()
@Entity('unit_images')
export class UnitImage {
  @Field(() => ID)
  @PrimaryColumn({ name: 'unit_id' })
  unitId: string;

  @Field(() => ID)
  @PrimaryColumn({ name: 'image_id' })
  imageId: string;

  @Field(() => Int)
  @Column({ name: 'order' })
  order: number;

  @Field(() => Unit)
  @ManyToOne(() => Unit, (unit) => unit.unitImages)
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @Field(() => Image)
  @ManyToOne(() => Image)
  @JoinColumn({ name: 'image_id' })
  image: Image;
}
