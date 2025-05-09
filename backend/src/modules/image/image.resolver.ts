import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Image } from '../../common/entities/image.entity';
import { CreateImageInput } from './dto/create-image.input';
import { ImageService } from './image.service';

@Resolver(() => Image)
export class ImageResolver {
  constructor(private imageService: ImageService) {}

  @Query(() => [Image])
  async images(): Promise<Image[]> {
    return this.imageService.findAll();
  }

  @Query(() => Image, { nullable: true })
  async image(@Args('id') id: string): Promise<Image> {
    return this.imageService.findOne(id);
  }

  @Mutation(() => Image)
  async createImage(
    @Args('createImageInput') createImageInput: CreateImageInput
  ): Promise<Image> {
    return this.imageService.create(createImageInput);
  }
}
