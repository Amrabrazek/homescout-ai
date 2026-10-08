import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Developer } from './developer.entity';
import { Unit } from './unit.entity';

@ObjectType()
@Entity('projects')
export class Project {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  name: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  area?: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  city?: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  region?: string;

  @Field(() => Float, { nullable: true })
  @Column('decimal', { precision: 9, scale: 6, nullable: true })
  lat?: number;

  @Field(() => Float, { nullable: true })
  @Column('decimal', { precision: 9, scale: 6, nullable: true })
  lng?: number;

  @Field()
  @Column({ name: 'developer_id' })
  developerId: string;

  @Field(() => Developer)
  @ManyToOne(() => Developer, (developer) => developer.projects)
  @JoinColumn({ name: 'developer_id' })
  developer: Developer;

  @Field(() => [Unit], { nullable: true })
  @OneToMany(() => Unit, (unit) => unit.project)
  units?: Unit[];
}
