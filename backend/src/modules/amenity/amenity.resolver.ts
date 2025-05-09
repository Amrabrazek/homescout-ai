import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Amenity } from '../../common/entities/amenity.entity';
import { AmenityService } from './amenity.service';
import { CreateAmenityInput } from './dto/create-amenity.input';

@Resolver(() => Amenity)
export class AmenityResolver {
  constructor(private amenityService: AmenityService) {}

  @Query(() => [Amenity])
  async amenities(): Promise<Amenity[]> {
    return this.amenityService.findAll();
  }

  @Query(() => Amenity, { nullable: true })
  async amenity(@Args('id') id: string): Promise<Amenity> {
    return this.amenityService.findOne(id);
  }

  @Mutation(() => Amenity)
  async createAmenity(
    @Args('createAmenityInput') createAmenityInput: CreateAmenityInput,
  ): Promise<Amenity> {
    return this.amenityService.create(createAmenityInput);
  }
} 