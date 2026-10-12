import {
  Args,
  Field,
  Float,
  Int,
  ObjectType,
  Query,
  Resolver,
  registerEnumType,
} from '@nestjs/graphql';
import { Unit } from '../../common/entities/unit.entity';
import { BuyerId, OptionalBuyerId } from '../buyer/buyer-id.decorator';
import { FeedSection, FeedService } from './feed.service';

registerEnumType(FeedSection, { name: 'FeedSection' });

@ObjectType()
export class MatchedUnit {
  @Field(() => Unit)
  unit: Unit;

  @Field(() => Int, {
    nullable: true,
    description: 'Match % for this buyer; null when there is nothing to match',
  })
  matchScore: number | null;

  @Field(() => [String], {
    description: 'Short reasons from the score parts, e.g. "In your budget"',
  })
  reasons: string[];
}

@ObjectType()
export class Feed {
  @Field(() => FeedSection)
  section: FeedSection;

  @Field({
    description:
      'No preferences and no activity yet: items are popular, varied units',
  })
  coldStart: boolean;

  @Field(() => [MatchedUnit])
  items: MatchedUnit[];
}

@ObjectType()
export class SimilarUnit extends MatchedUnit {
  @Field(() => Float, {
    description: 'Closeness to the unit, blended with the buyer match, 0 to 1',
  })
  score: number;
}

@Resolver()
export class FeedResolver {
  constructor(private readonly feed: FeedService) {}

  @Query(() => Feed, { description: "The buyer's home page sections" })
  forYou(
    @BuyerId() buyerId: string,
    @Args('section', {
      type: () => FeedSection,
      defaultValue: FeedSection.FOR_YOU,
    })
    section: FeedSection,
    @Args('limit', { type: () => Int, defaultValue: 8 }) limit: number,
    @Args('since', {
      nullable: true,
      description: 'Start of "new since your last visit"',
    })
    since?: Date
  ): Promise<Feed> {
    return this.feed.forYou(buyerId, section, Math.min(limit, 24), since);
  }

  @Query(() => [SimilarUnit], {
    description:
      'Neighbours of a unit, re-ranked with the buyer when x-buyer-id is sent',
  })
  similarUnits(
    @OptionalBuyerId() buyerId: string | null,
    @Args('unitId') unitId: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number
  ): Promise<SimilarUnit[]> {
    return this.feed.similarUnits(buyerId, unitId, limit ?? 4);
  }
}
