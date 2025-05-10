import { useQuery } from '@apollo/client';
import { GET_UNITS, GET_FILTER_DATA, GET_PROJECTS } from './queries';
import type {
  GetUnitsQueryResponse,
  GetUnitsQueryVariables,
  UnitFilter,
  Unit,
} from './types';

const UNITS_PER_PAGE = 20;

export function useUnits(filter: UnitFilter, offset = 0) {
  return useQuery<GetUnitsQueryResponse, GetUnitsQueryVariables>(GET_UNITS, {
    variables: {
      filter,
      limit: UNITS_PER_PAGE,
      offset,
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: 'network-only',
  });
}

export function useFilterData() {
  return useQuery(GET_FILTER_DATA);
}

export function useProjects(searchTerm: string, offset = 0) {
  return useQuery(GET_PROJECTS, {
    variables: {
      searchTerm,
      limit: 10,
      offset,
    },
  });
}

// Helper hook for infinite scroll
export function useInfiniteUnits(filter: UnitFilter) {
  const { data, loading, error, fetchMore, networkStatus } = useUnits(filter);

  const loadMore = async () => {
    if (loading || !data?.units.items.length) return;

    await fetchMore({
      variables: {
        offset: data.units.items.length,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          units: {
            items: [...prev.units.items, ...fetchMoreResult.units.items],
            total: fetchMoreResult.units.total,
            __typename: prev.units.__typename,
          },
        };
      },
    });
  };

  return {
    units: data?.units.items || [],
    total: data?.units.total || 0,
    loading,
    error,
    loadMore,
    isFetchingMore: networkStatus === 3,
  };
}
