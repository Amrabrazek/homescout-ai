'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import UnitCard, { UnitCardSkeleton } from '@/app/components/UnitCard';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

const GET_UNITS = gql`
  query GetUnits($filter: UnitFilterInput, $limit: Int, $offset: Int) {
    units(filter: $filter, limit: $limit, offset: $offset) {
      items {
        id
        name
        number
        floor
        rooms
        bathrooms
        floorArea
        price
        description
        project {
          id
          name
          developer {
            id
            name
          }
        }
        amenities {
          id
          name
          icon
        }
        images {
          id
          url
          altText
        }
      }
      total
    }
  }
`;

type UnitListingProps = {
  filters: {
    searchTerm?: string;
    projectIds?: string[];
    amenityIds?: string[];
    minRooms?: number;
    maxRooms?: number;
    minPrice?: number;
    maxPrice?: number;
    minFloorArea?: number;
    maxFloorArea?: number;
  };
  onCountsUpdate?: (total: number, displayed: number) => void;
};

const UNITS_PER_PAGE = 20;
// Fixed number of skeleton cards to display in initial load
const SKELETON_COUNT = 9;

export default function UnitListing({
  filters,
  onCountsUpdate,
}: UnitListingProps) {
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastUnitElementRef = useRef<HTMLDivElement | null>(null);

  // Reset hasMore when filters change
  useEffect(() => {
    setHasMore(true);
  }, [filters]);

  const { data, loading, error, fetchMore, networkStatus } = useQuery(
    GET_UNITS,
    {
      variables: {
        filter: filters,
        limit: UNITS_PER_PAGE,
        offset: 0,
      },
      notifyOnNetworkStatusChange: true,
      fetchPolicy: 'network-only', // Always fetch fresh data when filters change
    }
  );

  // Is fetching more data (not the initial load)
  const isFetchingMore = networkStatus === 3;

  const loadMoreUnits = useCallback(() => {
    if (loading || !hasMore) return;

    fetchMore({
      variables: {
        offset: data?.units?.items?.length || 0,
        limit: UNITS_PER_PAGE,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult || fetchMoreResult.units.items.length === 0) {
          setHasMore(false);
          return prev;
        }

        return {
          units: {
            items: [...prev.units.items, ...fetchMoreResult.units.items],
            total: fetchMoreResult.units.total,
            __typename: prev.units.__typename,
          },
        };
      },
    });
  }, [data?.units?.items?.length, fetchMore, hasMore, loading]);

  // Setup the intersection observer to detect when user scrolls to the bottom
  useEffect(() => {
    if (loading) return;

    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreUnits();
      }
    });

    if (lastUnitElementRef.current) {
      observer.current.observe(lastUnitElementRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [loading, hasMore, loadMoreUnits]);

  // Notify parent component about the counts when data changes
  useEffect(() => {
    if (data?.units) {
      onCountsUpdate?.(data.units.total, data.units.items.length);
    }
  }, [data?.units, onCountsUpdate]);

  if (error) {
    return (
      <div className='w-full p-8 text-center'>
        <p className='text-red-500'>Error loading units: {error.message}</p>
      </div>
    );
  }

  const units = data?.units?.items || [];
  const totalUnits = data?.units?.total || 0;
  const isInitialLoading = loading && units.length === 0;

  // Helper function to render skeleton cards using the imported UnitCardSkeleton
  const renderSkeletons = (count: number) =>
    Array.from({ length: count }).map((_, i) => <UnitCardSkeleton key={i} />);

  return (
    // Outer container with fixed width to prevent layout shifts
    <div className='w-full'>
      <div className='mb-4 flex justify-between items-center'>
        <h2 className='text-xl font-semibold'>
          {isInitialLoading
            ? 'Loading units...'
            : `${totalUnits} Units available`}
        </h2>
      </div>

      {/* 
        Two layout options based on state:
        1. Grid layout for loading and populated states
        2. Full width layout for empty state
        Both with fixed dimensions to prevent layout shifts
      */}
      {units.length === 0 && !isInitialLoading ? (
        // Empty state container with consistent dimensions
        <div className='w-full min-h-[800px] flex items-center justify-center'>
          <div className='w-full max-w-[550px]'>
            <EmptyState
              title='No units found'
              description='No properties match your current filters. Try different filters or clear all filters.'
            />
          </div>
        </div>
      ) : (
        // Grid for loading and populated states
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[800px] w-full'>
          {isInitialLoading ? (
            // Always render exactly SKELETON_COUNT skeletons for consistency
            renderSkeletons(SKELETON_COUNT)
          ) : (
            <>
              {/* Render existing units */}
              {units.map((unit: any, index: number) => {
                if (units.length === index + 1) {
                  return (
                    <div
                      ref={lastUnitElementRef}
                      key={unit.id}
                      className='w-full'
                    >
                      <UnitCard unit={unit} />
                    </div>
                  );
                } else {
                  return (
                    <div key={unit.id} className='w-full'>
                      <UnitCard unit={unit} />
                    </div>
                  );
                }
              })}

              {/* Add placeholder elements to maintain grid structure when few units */}
              {units.length > 0 &&
                units.length < 3 &&
                Array.from({ length: 3 - units.length }).map((_, i) => (
                  <div
                    key={`placeholder-${i}`}
                    className='hidden lg:block w-full'
                  ></div>
                ))}

              {/* Render skeleton cards when loading more - always in multiples of 3 */}
              {isFetchingMore && renderSkeletons(3)}
            </>
          )}
        </div>
      )}

      {/* No more units message */}
      {!hasMore && units.length > 0 && !loading && (
        <div className='text-center p-4 mt-4 text-gray-500'>
          {units.length === totalUnits
            ? 'All units loaded'
            : `Showing ${units.length} of ${totalUnits} units`}
        </div>
      )}
    </div>
  );
}
