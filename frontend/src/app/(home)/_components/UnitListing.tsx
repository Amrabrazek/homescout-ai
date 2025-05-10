'use client';

import { useState, useEffect, useRef } from 'react';
import UnitCard, { UnitCardSkeleton } from '@/app/(home)/_components/UnitCard';
import { EmptyState } from '@/components/ui/empty-state';
import { useInfiniteUnits } from '@/lib/graphql/units/hooks';
import type { UnitFilter } from '@/lib/graphql/units/types';

type UnitListingProps = {
  filters: UnitFilter;
  onCountsUpdate?: (total: number, displayed: number) => void;
};

const SKELETON_COUNT = 9;

export default function UnitListing({
  filters,
  onCountsUpdate,
}: UnitListingProps) {
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastUnitElementRef = useRef<HTMLDivElement | null>(null);

  const { units, total, loading, error, loadMore, isFetchingMore } =
    useInfiniteUnits(filters);

  // Reset hasMore when filters change
  useEffect(() => {
    setHasMore(true);
  }, [filters]);

  // Setup the intersection observer to detect when user scrolls to the bottom
  useEffect(() => {
    if (loading) return;

    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
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
  }, [loading, hasMore, loadMore]);

  // Update counts when units change
  useEffect(() => {
    if (onCountsUpdate) {
      onCountsUpdate(total, units.length);
    }
  }, [total, units.length, onCountsUpdate]);

  if (error) {
    return (
      <div className='w-full p-8 text-center'>
        <p className='text-red-500'>Error loading units: {error.message}</p>
      </div>
    );
  }

  const isInitialLoading = loading && units.length === 0;

  // Helper function to render skeleton cards
  const renderSkeletons = (count: number) =>
    Array.from({ length: count }).map((_, i) => <UnitCardSkeleton key={i} />);

  return (
    <div className='w-full'>
      <div className='mb-4 flex justify-between items-center'>
        <h2 className='text-xl font-semibold'>
          {isInitialLoading ? 'Loading units...' : `${total} Units available`}
        </h2>
      </div>

      {units.length === 0 && !isInitialLoading ? (
        <div className='w-full min-h-[800px] flex items-center justify-center'>
          <div className='w-full max-w-[550px]'>
            <EmptyState
              title='No units found'
              description='No properties match your current filters. Try different filters or clear all filters.'
            />
          </div>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full'>
          {isInitialLoading ? (
            renderSkeletons(SKELETON_COUNT)
          ) : (
            <>
              {units.map((unit, index) => {
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

              {isFetchingMore && renderSkeletons(5)}
            </>
          )}
        </div>
      )}

      {!hasMore && units.length > 0 && !loading && (
        <div className='text-center p-4 mt-4 text-gray-500'>
          {units.length === total
            ? 'All units loaded'
            : `Showing ${units.length} of ${total} units`}
        </div>
      )}
    </div>
  );
}
