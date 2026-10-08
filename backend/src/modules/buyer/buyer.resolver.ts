import { ParseUUIDPipe } from '@nestjs/common';
import {
  Args,
  Field,
  Int,
  Mutation,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { BuyerProfile } from '../../common/entities/buyer-profile.entity';
import { Unit } from '../../common/entities/unit.entity';
import { BuyerEventType } from '../../common/enums/buyer-event-type';
import { BuyerId } from './buyer-id.decorator';
import { BuyerService } from './buyer.service';
import { UpdatePreferencesInput } from './dto/update-preferences.input';

@ObjectType({
  description: 'Distinct units the buyer viewed, saved or skipped',
})
export class BuyerActivity {
  @Field(() => Int)
  views: number;

  @Field(() => Int)
  saves: number;

  @Field(() => Int)
  skips: number;
}

/** Every operation acts on the buyer named by the x-buyer-id header. */
@Resolver(() => BuyerProfile)
export class BuyerResolver {
  constructor(private readonly buyers: BuyerService) {}

  @Query(() => BuyerProfile)
  myProfile(@BuyerId() buyerId: string): Promise<BuyerProfile> {
    return this.buyers.getProfile(buyerId);
  }

  @Query(() => [Unit])
  savedUnits(@BuyerId() buyerId: string): Promise<Unit[]> {
    return this.buyers.savedUnits(buyerId);
  }

  @Mutation(() => BuyerProfile)
  updatePreferences(
    @BuyerId() buyerId: string,
    @Args('input') input: UpdatePreferencesInput
  ): Promise<BuyerProfile> {
    return this.buyers.updatePreferences(buyerId, input);
  }

  @Mutation(() => Boolean)
  async recordBuyerEvent(
    @BuyerId() buyerId: string,
    @Args('unitId', ParseUUIDPipe) unitId: string,
    @Args('type', { type: () => BuyerEventType }) type: BuyerEventType
  ): Promise<boolean> {
    await this.buyers.recordEvent(buyerId, unitId, type);
    return true;
  }

  @Mutation(() => Boolean)
  async unsaveUnit(
    @BuyerId() buyerId: string,
    @Args('unitId', ParseUUIDPipe) unitId: string
  ): Promise<boolean> {
    await this.buyers.unsaveUnit(buyerId, unitId);
    return true;
  }

  @Mutation(() => BuyerProfile)
  resetProfile(@BuyerId() buyerId: string): Promise<BuyerProfile> {
    return this.buyers.reset(buyerId);
  }

  @ResolveField(() => [String])
  savedUnitIds(@Parent() profile: BuyerProfile): Promise<string[]> {
    return this.buyers.savedUnitIds(profile.id);
  }

  @ResolveField(() => BuyerActivity)
  activity(@Parent() profile: BuyerProfile): Promise<BuyerActivity> {
    return this.buyers.activity(profile.id);
  }

  @ResolveField(() => Boolean, {
    description: 'Whether a taste vector exists for the active embedding model',
  })
  async hasTasteVector(@Parent() profile: BuyerProfile): Promise<boolean> {
    return (await this.buyers.tasteVector(profile.id)) !== null;
  }
}
