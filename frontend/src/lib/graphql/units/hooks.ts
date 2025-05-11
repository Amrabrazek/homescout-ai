import { useQuery } from '@apollo/client';
import { GET_UNITS, GET_FILTER_DATA } from './queries';
import { useState, useEffect } from 'react';

import type {
  GetUnitsQueryResponse,
  GetUnitsQueryVariables,
  UnitFilter,
  Unit,
  UnitSort,
} from './types';

const UNITS_PER_PAGE = 20;

export function useUnits(filter: UnitFilter, sort?: UnitSort, offset = 0) {
  return useQuery<GetUnitsQueryResponse, GetUnitsQueryVariables>(GET_UNITS, {
    variables: {
      filter,
      sort,
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

// Helper hook for infinite scroll
export function useInfiniteUnits(filter: UnitFilter, sort?: UnitSort) {
  const { data, loading, error, fetchMore, networkStatus } = useUnits(
    filter,
    sort
  );
  const [items, setItems] = useState<Unit[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Reset items when filter or sort changes
  useEffect(() => {
    if (data?.units.items) {
      setItems(data.units.items);
      // Check if we should allow loading more
      setHasMore(data.units.items.length < data.units.total);
    }
  }, [data, filter, sort]);

  const loadMore = async () => {
    if (loading || !items.length || !hasMore) return;

    try {
      const result = await fetchMore({
        variables: {
          offset: items.length,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;

          const newItems = fetchMoreResult.units.items;
          const updatedItems = [...prev.units.items, ...newItems];

          // Update hasMore flag based on total vs current items
          setHasMore(updatedItems.length < fetchMoreResult.units.total);

          return {
            units: {
              items: updatedItems,
              total: fetchMoreResult.units.total,
              __typename: prev.units.__typename,
            },
          };
        },
      });

      // If no new items were returned, we've reached the end
      if (result.data.units.items.length === 0) {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more units:', err);
      // Don't disable infinite scroll on error to allow retrying
    }
  };

  return {
    units: items,
    total: data?.units.total || 0,
    loading,
    error,
    loadMore,
    hasMore,
    isFetchingMore: networkStatus === 3,
  };
}
