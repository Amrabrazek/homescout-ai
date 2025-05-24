import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Int,
  ObjectType,
  Field,
  Float,
} from '@nestjs/graphql';
import { Project } from '../../common/entities/project.entity';
import { Unit } from '../../common/entities/unit.entity';
import { UnitImage } from '../../common/entities/unit-image.entity';
import { Amenity } from '../../common/entities/amenity.entity';
import { Image } from '../../common/entities/image.entity';
import { ProjectService } from '../project/project.service';
import { CreateUnitInput } from './dto/create-unit.input';
import { UpdateUnitInput } from './dto/update-unit.input';
import { UnitFilterInput } from './dto/unit-filter.input';
import { UnitService } from './unit.service';
import { UnitSortInput } from './dto/unit-sort.input';

@ObjectType()
export class FacetCountValue {
  @Field()
  value: string;

  @Field(() => Int)
  count: number;
}

@ObjectType()
export class FacetStatsValue {
  @Field(() => Float, { nullable: true })
  min?: number;

  @Field(() => Float, { nullable: true })
  max?: number;

  @Field(() => Float, { nullable: true })
  avg?: number;

  @Field(() => Float, { nullable: true })
  sum?: number;
}

@ObjectType()
export class FacetCount {
  @Field()
  field_name: string;

  @Field(() => [FacetCountValue])
  counts: FacetCountValue[];

  @Field(() => FacetStatsValue, { nullable: true })
  stats?: FacetStatsValue;
}

@ObjectType()
export class UnitResponse {
  @Field(() => [Unit])
  items: Unit[];

  @Field(() => Int)
  total: number;

  @Field(() => [FacetCount], { nullable: true })
  facets?: FacetCount[];
}

@Resolver(() => Unit)
export class UnitResolver {
  constructor(
    private unitService: UnitService,
    private projectService: ProjectService
  ) {}

  @Query(() => UnitResponse)
  async units(
    @Args('filter', { nullable: true }) filter?: UnitFilterInput,
    @Args('sort', { nullable: true }) sort?: UnitSortInput,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number
  ): Promise<UnitResponse> {
    const [items, total, facetCounts] = await this.unitService.findAllWithCount(
      filter,
      sort,
      limit,
      offset
    );
    return { items, total, facets: facetCounts };
  }

  @Query(() => Unit, { nullable: true })
  async unit(@Args('id') id: string): Promise<Unit> {
    return this.unitService.findOne(id);
  }

  @Mutation(() => Unit)
  async createUnit(
    @Args('createUnitInput') createUnitInput: CreateUnitInput
  ): Promise<Unit> {
    return this.unitService.create(createUnitInput);
  }

  @Mutation(() => Unit)
  async updateUnit(
    @Args('updateUnitInput') updateUnitInput: UpdateUnitInput
  ): Promise<Unit> {
    return this.unitService.update(updateUnitInput.id, updateUnitInput);
  }

  @Mutation(() => Unit)
  async deleteUnit(@Args('id') id: string): Promise<Unit> {
    return this.unitService.delete(id);
  }

  @ResolveField(() => Project)
  async project(@Parent() unit: Unit): Promise<Project> {
    const projectId = unit.projectId || (unit as any).project_id;
    return this.projectService.findOne(projectId);
  }

  @ResolveField(() => [Amenity])
  async amenities(@Parent() unit: Unit): Promise<Amenity[]> {
    return this.unitService.getUnitAmenities(unit.id);
  }

  @ResolveField(() => [UnitImage])
  async unitImages(@Parent() unit: Unit): Promise<UnitImage[]> {
    // This would be implemented in the UnitService
    return [];
  }

  @ResolveField(() => [Image])
  async images(@Parent() unit: Unit): Promise<Image[]> {
    return this.unitService.getUnitImages(unit.id);
  }

  @Query(() => [Unit])
  async similarUnits(
    @Args('unitId') unitId: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number
  ): Promise<Unit[]> {
    return this.unitService.findSimilarUnits(unitId, limit);
  }
}
