import { useQuery } from '@apollo/client';
import {
  GET_UNITS,
  GET_FILTER_DATA,
  SEARCH_UNITS,
  SIMILAR_UNITS_QUERY,
  SEARCH_SIMILAR_UNITS,
  SEARCH_FACETS,
} from './queries';
import { useState, useEffect, useCallback } from 'react';

import type {
  GetUnitsQueryResponse,
  GetUnitsQueryVariables,
  TypesenseSearchResponse,
  UnitFilter,
  Unit,
  UnitSort,
  FacetCount,
  FacetCountValue,
  UnitsResponse,
  GetSimilarUnitsQueryResponse,
  TypesenseSimilarUnitsResponse,
  SimilarUnitsQueryVariables,
} from './types';

const UNITS_PER_PAGE = 20;

// Read USE_TYPESENSE from environment variables with a fallback
const USE_TYPESENSE = process.env.NEXT_PUBLIC_USE_TYPESENSE === 'true';

// Database-specific query functions
function useDbUnits(filter: UnitFilter, sort?: UnitSort, offset = 0) {
  return useQuery<GetUnitsQueryResponse, GetUnitsQueryVariables>(GET_UNITS, {
    variables: {
      filter,
      sort,
      limit: UNITS_PER_PAGE,
      offset,
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: 'cache-first',
  });
}

// Typesense-specific query functions
function useTypesenseUnits(filter: UnitFilter, sort?: UnitSort, offset = 0) {
  return useQuery<TypesenseSearchResponse, GetUnitsQueryVariables>(
    SEARCH_UNITS,
    {
      variables: {
        filter,
        sort,
        limit: UNITS_PER_PAGE,
        offset,
      },
      notifyOnNetworkStatusChange: true,
      fetchPolicy: 'cache-and-network',
    }
  );
}

// Database-specific similar units query
function useDbSimilarUnits(unitId: string, limit = 5) {
  return useQuery<GetSimilarUnitsQueryResponse, SimilarUnitsQueryVariables>(
    SIMILAR_UNITS_QUERY,
    {
      variables: {
        unitId,
        limit,
      },
      fetchPolicy: 'cache-and-network',
    }
  );
}

// Typesense-specific similar units query
function useTypesenseSimilarUnits(unitId: string, limit = 5) {
  return useQuery<TypesenseSimilarUnitsResponse, SimilarUnitsQueryVariables>(
    SEARCH_SIMILAR_UNITS,
    {
      variables: {
        unitId,
        limit,
      },
      fetchPolicy: 'cache-and-network',
    }
  );
}

// Helper function to get units data from either query response
function getUnitsData(
  data: GetUnitsQueryResponse | TypesenseSearchResponse | undefined
): UnitsResponse | undefined {
  if (!data) return undefined;

  if ('units' in data) {
    return data.units;
  } else if ('searchUnits' in data) {
    // Handle string facets from Typesense search
    const searchUnits = data.searchUnits;

    // Convert SearchUnit to Unit if needed for compatibility
    const compatUnits: UnitsResponse = {
      ...searchUnits,
      items: searchUnits.items.map((item) => {
        // Cast SearchUnit as Unit - they have the same structure
        return item as any as Unit;
      }),
    };

    return compatUnits;
  }

  return undefined;
}

// USE_TYPESENSE is fixed at build time, so the same hook runs on every render.
export const useUnits = USE_TYPESENSE ? useTypesenseUnits : useDbUnits;

export function useFilterData() {
  return useQuery(GET_FILTER_DATA);
}

// Helper function to get similar units data from either query response
export function getSimilarUnitsData(
  data: GetSimilarUnitsQueryResponse | TypesenseSimilarUnitsResponse | undefined
): Unit[] | undefined {
  if (!data) return undefined;

  if ('similarUnits' in data) {
    return data.similarUnits;
  } else if ('searchSimilarUnits' in data) {
    // Convert SearchUnit to Unit if needed for compatibility
    return data.searchSimilarUnits.map((item) => {
      // Cast SearchUnit as Unit - they have the same structure
      return item as any as Unit;
    });
  }

  return undefined;
}

export const useSimilarUnits = USE_TYPESENSE
  ? useTypesenseSimilarUnits
  : useDbSimilarUnits;

// Helper hook for infinite scroll
export function useInfiniteUnits(filter: UnitFilter, sort?: UnitSort) {
  const { data, loading, error, fetchMore, networkStatus } = useUnits(
    filter,
    sort
  );
  const [items, setItems] = useState<Unit[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const isFetchingMore = networkStatus === 3 || loadingMore;

  // Get the units response from either query
  const unitsData = getUnitsData(data);

  // Reset items when filter or sort changes
  useEffect(() => {
    if (unitsData?.items) {
      setItems(unitsData.items);
      // Check if we should allow loading more
      setHasMore(unitsData.items.length < unitsData.total);
    }
  }, [data, filter, sort]);

  const loadMore = useCallback(async () => {
    if (loading || !items.length || !hasMore || isFetchingMore) return;

    try {
      setLoadingMore(true);

      // Use the current items length as the offset for the next page
      const result = await fetchMore({
        variables: {
          offset: items.length,
          limit: UNITS_PER_PAGE,
        },
      });

      // Get the units response from the result
      const resultData = getUnitsData(result.data);

      // If no new items were returned, we've reached the end
      if (!resultData?.items || resultData.items.length === 0) {
        setHasMore(false);
      }

      // Get the combined items from the cache after Apollo merges them
      // This is more reliable than manually merging
      if (resultData?.items) {
        // For safety, make sure we don't have duplicates
        const allItems = [...items];

        resultData.items.forEach((newItem: Unit) => {
          if (!allItems.some((item) => item.id === newItem.id)) {
            allItems.push(newItem);
          }
        });

        setItems(allItems);
        setHasMore(allItems.length < resultData.total);
      }
    } catch (err) {
      console.error('Error loading more units:', err);
      // Don't disable infinite scroll on error to allow retrying
    } finally {
      setLoadingMore(false);
    }
  }, [loading, items, hasMore, isFetchingMore, fetchMore]);

  return {
    units: items,
    total: unitsData?.total || 0,
    loading: loading && !isFetchingMore,
    error,
    loadMore,
    hasMore,
    isFetchingMore,
  };
}

/**
 * Hook for efficiently getting facet counts without loading unit data
 * This is more efficient for filter components that don't need the actual units
 */
export function useSearchFacets(filter: UnitFilter) {
  const [cachedFacets, setCachedFacets] = useState<FacetCount[]>([]);

  const { data, loading, error } = useQuery(SEARCH_FACETS, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  });

  const facets = data?.searchFacets?.facets || [];
  const total = data?.searchFacets?.total || 0;

  // Set cachedFacets when data is successfully loaded and not loading or in error
  useEffect(() => {
    if (!loading && !error && facets.length > 0) {
      setCachedFacets(facets);
    }
  }, [facets, loading, error]);

  // Helper methods to get specific facet counts
  const getProjectCounts = useCallback((): { id: string; count: number }[] => {
    // Use cachedFacets here to provide immediate results if data is still loading
    const targetFacets =
      loading && cachedFacets.length > 0 ? cachedFacets : facets;
    const projectFacet = targetFacets.find(
      (f: FacetCount) => f.field_name === 'projectId'
    );
    if (!projectFacet) return [];

    return projectFacet.counts.map((c: FacetCountValue) => ({
      id: c.value,
      count: c.count,
    }));
  }, [facets, cachedFacets, loading]); // Add cachedFacets and loading to dependencies

  const getAmenityCounts = useCallback((): { id: string; count: number }[] => {
    const targetFacets =
      loading && cachedFacets.length > 0 ? cachedFacets : facets;
    const amenityFacet = targetFacets.find(
      (f: FacetCount) => f.field_name === 'amenityIds'
    );
    if (!amenityFacet) return [];

    return amenityFacet.counts.map((c: FacetCountValue) => ({
      id: c.value,
      count: c.count,
    }));
  }, [facets, cachedFacets, loading]);

  const getRoomCounts = useCallback((): { value: number; count: number }[] => {
    const targetFacets =
      loading && cachedFacets.length > 0 ? cachedFacets : facets;
    const roomsFacet = targetFacets.find(
      (f: FacetCount) => f.field_name === 'rooms'
    );
    if (!roomsFacet) return [];

    return roomsFacet.counts
      .map((c: FacetCountValue) => ({
        value: parseInt(c.value),
        count: c.count,
      }))
      .sort((a: { value: number }, b: { value: number }) => a.value - b.value);
  }, [facets, cachedFacets, loading]);

  const getPriceStats = useCallback(() => {
    const targetFacets =
      loading && cachedFacets.length > 0 ? cachedFacets : facets;
    const priceFacet = targetFacets.find(
      (f: FacetCount) => f.field_name === 'price'
    );
    return priceFacet?.stats;
  }, [facets, cachedFacets, loading]);

  const getFloorAreaStats = useCallback(() => {
    const targetFacets =
      loading && cachedFacets.length > 0 ? cachedFacets : facets;
    const floorAreaFacet = targetFacets.find(
      (f: FacetCount) => f.field_name === 'floorArea'
    );
    return floorAreaFacet?.stats;
  }, [facets, cachedFacets, loading]);

  return {
    facets: cachedFacets.length > 0 ? cachedFacets : facets, // Return cachedFacets if available, otherwise current facets
    total,
    loading,
    error,
    getProjectCounts,
    getAmenityCounts,
    getRoomCounts,
    getPriceStats,
    getFloorAreaStats,
  };
}
