import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { SearchService } from './search.service';
import { UnitFilterInput } from '../unit/dto/unit-filter.input';
import { UnitSortInput } from '../unit/dto/unit-sort.input';
import { SearchUnitsResponse, FacetCountResponse } from './search.model';

@Resolver()
export class SearchResolver {
  constructor(private readonly searchService: SearchService) {}

  @Query(() => SearchUnitsResponse, { name: 'searchUnits' })
  async searchUnits(
    @Args('filter', { nullable: true }) filter?: UnitFilterInput,
    @Args('sort', { nullable: true }) sort?: UnitSortInput,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number
  ) {
    return this.searchService.search({
      filter,
      sort,
      limit,
      offset,
      facets: true,
    });
  }

  @Query(() => FacetCountResponse, { name: 'searchFacets' })
  async searchFacets(
    @Args('filter', { nullable: true }) filter?: UnitFilterInput
  ) {
    return this.searchService.getFacetCounts(filter);
  }
}
