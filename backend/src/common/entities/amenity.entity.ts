import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Unit } from './unit.entity';

@ObjectType()
@Entity('amenities')
export class Amenity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  name: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  icon?: string;

  @Field(() => [Unit], { nullable: true })
  @ManyToMany(() => Unit, (unit) => unit.amenities)
  units?: Unit[];
}
