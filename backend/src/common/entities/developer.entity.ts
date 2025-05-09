import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Project } from './project.entity';

@ObjectType()
@Entity('developers')
export class Developer {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  name: string;

  @Field(() => [Project], { nullable: true })
  @OneToMany(() => Project, (project) => project.developer)
  projects?: Project[];
} 