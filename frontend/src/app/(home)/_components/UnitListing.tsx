'use client';

import { useState, useEffect, useRef } from 'react';
import UnitCard, { UnitCardSkeleton } from '@/app/(home)/_components/UnitCard';
import { EmptyState } from '@/components/ui/empty-state';
import { useInfiniteUnits } from '@/lib/graphql/units/hooks';
import type { UnitFilter, UnitSort } from '@/lib/graphql/units/types';

type UnitListingProps = {
  filters: UnitFilter;
  sort?: UnitSort;
  onCountsUpdate?: (total: number, displayed: number) => void;
};

const SKELETON_COUNT = 9;

export default function UnitListing({
  filters,
  sort = {},
  onCountsUpdate,
}: UnitListingProps) {
  const observer = useRef<IntersectionObserver | null>(null);
  const lastUnitElementRef = useRef<HTMLDivElement | null>(null);
  const [prevTotal, setPrevTotal] = useState(0);

  const { units, total, loading, error, loadMore, isFetchingMore, hasMore } =
    useInfiniteUnits(filters, sort);

  // Maintain the previous total during loading
  useEffect(() => {
    if (!loading && total > 0) {
      setPrevTotal(total);
    }
  }, [total, loading]);

  // Get the current total to display - use previous value during loading
  const currentTotal = loading && prevTotal > 0 ? prevTotal : total;

  // Setup the intersection observer to detect when user scrolls to the bottom
  useEffect(() => {
    if (loading && !isFetchingMore) return;

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
  }, [loading, hasMore, loadMore, isFetchingMore]);

  // Update counts when units change or loading changes
  useEffect(() => {
    if (onCountsUpdate) {
      onCountsUpdate(currentTotal, loading ? 0 : units.length);
    }
  }, [currentTotal, units.length, onCountsUpdate, loading]);

  if (error) {
    return (
      <div className='w-full min-h-[800px] flex items-center justify-center'>
        <div className='w-full max-w-[550px]'>
          <EmptyState
            title='Unable to load units'
            description='There was a problem loading the available units. Please try again later.'
          />
        </div>
      </div>
    );
  }

  // Helper function to render skeleton cards
  const renderSkeletons = (count: number) =>
    Array.from({ length: count }).map((_, i) => <UnitCardSkeleton key={i} />);

  // Always show skeletons during any loading state
  // This gives a more responsive feel and prevents lag perception
  if (loading && !isFetchingMore) {
    return (
      <div className='w-full'>
        <div className='mb-4 flex justify-between items-center'>
          <h2 className='text-xl font-semibold'>
            {prevTotal > 0
              ? `${prevTotal} Units available`
              : 'Loading units...'}
          </h2>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full'>
          {renderSkeletons(SKELETON_COUNT)}
        </div>
      </div>
    );
  }

  // Show empty state when no results
  if (units.length === 0 && !loading) {
    return (
      <div className='w-full'>
        <div className='mb-4 flex justify-between items-center'>
          <h2 className='text-xl font-semibold'>0 Units available</h2>
        </div>
        <div className='w-full min-h-[800px] flex items-center justify-center'>
          <div className='w-full max-w-[550px]'>
            <EmptyState
              title='No units found'
              description='No properties match your current filters. Try different filters or clear all filters.'
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full'>
      <div className='mb-4 flex justify-between items-center'>
        <h2 className='text-xl font-semibold'>{`${currentTotal} Units available`}</h2>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full'>
        {units.map((unit, index) => {
          if (units.length === index + 1) {
            return (
              <div ref={lastUnitElementRef} key={unit.id} className='w-full'>
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

        {isFetchingMore && renderSkeletons(3)}
      </div>

      {!hasMore && units.length > 0 && !loading && (
        <div className='text-center p-4 mt-4 text-gray-500'>
          {units.length === total
            ? 'All units loaded'
            : `Showing ${units.length} of ${currentTotal} units`}
        </div>
      )}
    </div>
  );
}
