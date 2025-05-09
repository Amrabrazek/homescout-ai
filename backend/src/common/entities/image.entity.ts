import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Unit } from './unit.entity';

@ObjectType()
@Entity('images')
export class Image {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  url: string;

  @Field({ nullable: true })
  @Column({ nullable: true, name: 'alt_text' })
  altText?: string;

  @Field(() => [Unit], { nullable: true })
  @ManyToMany(() => Unit, (unit) => unit.images)
  units?: Unit[];
}
