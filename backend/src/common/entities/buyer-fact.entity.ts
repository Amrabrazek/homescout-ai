import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@ObjectType({
  description:
    'Something the buyer told the concierge that no preference field holds',
})
@Entity('buyer_facts')
export class BuyerFact {
  @Field(() => ID)
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column('uuid', { name: 'buyer_id' })
  buyerId: string;

  @Field()
  @Column('text')
  text: string;

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
