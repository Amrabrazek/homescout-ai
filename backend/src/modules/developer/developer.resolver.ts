import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Developer } from '../../common/entities/developer.entity';
import { DeveloperService } from './developer.service';
import { CreateDeveloperInput } from './dto/create-developer.input';

@Resolver(() => Developer)
export class DeveloperResolver {
  constructor(private developerService: DeveloperService) {}

  @Query(() => [Developer])
  async developers(): Promise<Developer[]> {
    return this.developerService.findAll();
  }

  @Query(() => Developer, { nullable: true })
  async developer(@Args('id') id: string): Promise<Developer> {
    return this.developerService.findOne(id);
  }

  @Mutation(() => Developer)
  async createDeveloper(
    @Args('createDeveloperInput') createDeveloperInput: CreateDeveloperInput
  ): Promise<Developer> {
    return this.developerService.create(createDeveloperInput);
  }
}
