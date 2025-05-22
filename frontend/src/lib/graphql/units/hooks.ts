import { useQuery } from '@apollo/client';
import { GET_UNITS, GET_FILTER_DATA } from './queries';
import { useState, useEffect } from 'react';

import type {
  GetUnitsQueryResponse,
  GetUnitsQueryVariables,
  UnitFilter,
  Unit,
  UnitSort,
  FacetCount,
  FacetCountValue,
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

// Helper hook to get facet counts from Typesense
export function useFacetCounts(filter: UnitFilter, sort?: UnitSort) {
  const { data, loading, error } = useUnits(filter, sort);
  const [cachedFacets, setCachedFacets] = useState<FacetCount[]>([]);

  // Update cached facets only when we have new data and it's not loading
  useEffect(() => {
    if (!loading && data?.units.facets) {
      setCachedFacets(data.units.facets);
    }
  }, [data, loading]);

  // Use cached facets or new facets, but never empty facets during loading
  const facets = loading ? cachedFacets : data?.units.facets || cachedFacets;

  // Create helper methods to get specific facet counts
  const getProjectCounts = (): { id: string; count: number }[] => {
    const projectFacet = facets.find((f) => f.field_name === 'projectId');
    if (!projectFacet) return [];

    return projectFacet.counts.map((c) => ({
      id: c.value,
      count: c.count,
    }));
  };

  const getAmenityCounts = (): { id: string; count: number }[] => {
    const amenityFacet = facets.find((f) => f.field_name === 'amenityIds');
    if (!amenityFacet) return [];

    return amenityFacet.counts.map((c) => ({
      id: c.value,
      count: c.count,
    }));
  };

  const getRoomCounts = (): { value: number; count: number }[] => {
    const roomsFacet = facets.find((f) => f.field_name === 'rooms');
    if (!roomsFacet) return [];

    return roomsFacet.counts
      .map((c) => ({
        value: parseInt(c.value),
        count: c.count,
      }))
      .sort((a, b) => a.value - b.value);
  };

  const getPriceStats = () => {
    const priceFacet = facets.find((f) => f.field_name === 'price');
    return priceFacet?.stats;
  };

  const getFloorAreaStats = () => {
    const floorAreaFacet = facets.find((f) => f.field_name === 'floorArea');
    return floorAreaFacet?.stats;
  };

  return {
    facets,
    loading,
    error,
    getProjectCounts,
    getAmenityCounts,
    getRoomCounts,
    getPriceStats,
    getFloorAreaStats,
  };
}

// Helper hook for infinite scroll
export function useInfiniteUnits(filter: UnitFilter, sort?: UnitSort) {
  const { data, loading, error, fetchMore, networkStatus } = useUnits(
    filter,
    sort
  );
  const [items, setItems] = useState<Unit[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Get facet counts
  const {
    facets,
    getProjectCounts,
    getAmenityCounts,
    getRoomCounts,
    getPriceStats,
    getFloorAreaStats,
  } = useFacetCounts(filter, sort);

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
              facets: fetchMoreResult.units.facets,
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
    facets: data?.units.facets || [],
    getProjectCounts,
    getAmenityCounts,
    getRoomCounts,
    getPriceStats,
    getFloorAreaStats,
    loading,
    error,
    loadMore,
    hasMore,
    isFetchingMore: networkStatus === 3,
  };
}
