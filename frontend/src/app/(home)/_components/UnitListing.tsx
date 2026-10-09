'use client';

import { useState, useEffect, useRef } from 'react';
import UnitCard, { UnitCardSkeleton } from '@/app/(home)/_components/UnitCard';
import { EmptyState } from '@/components/ui/empty-state';
import { useInfiniteUnits } from '@/lib/graphql/units/hooks';
import type { UnitFilter, UnitSort } from '@/lib/graphql/units/types';

type UnitListingProps = {
  filters: UnitFilter;
  sort?: UnitSort;
  savedUnitIds?: string[];
};

const SKELETON_COUNT = 8;
const GRID =
  'grid w-full grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

export default function UnitListing({
  filters,
  sort = {},
  savedUnitIds = [],
}: UnitListingProps) {
  const saved = new Set(savedUnitIds);
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
          <h2 className='text-xl font-extrabold tracking-tight'>
            {prevTotal > 0 ? homes(prevTotal) : 'Finding homes…'}
          </h2>
        </div>
        <div className={GRID}>{renderSkeletons(SKELETON_COUNT)}</div>
      </div>
    );
  }

  // Show empty state when no results
  if (units.length === 0 && !loading) {
    return (
      <div className='w-full'>
        <div className='mb-4 flex justify-between items-center'>
          <h2 className='text-xl font-extrabold tracking-tight'>
            No homes found
          </h2>
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
        <h2 className='text-xl font-extrabold tracking-tight'>
          {homes(currentTotal)}
        </h2>
      </div>

      <div className={GRID}>
        {units.map((unit, index) => {
          if (units.length - 5 === index) {
            return (
              <div ref={lastUnitElementRef} key={unit.id} className='w-full'>
                <UnitCard unit={unit} saved={saved.has(unit.id)} />
              </div>
            );
          } else {
            return (
              <div key={unit.id} className='w-full'>
                <UnitCard unit={unit} saved={saved.has(unit.id)} />
              </div>
            );
          }
        })}

        {isFetchingMore && renderSkeletons(3)}
      </div>

      {!hasMore && units.length > 0 && !loading && (
        <div className='text-center p-4 mt-4 text-muted-foreground'>
          {units.length === total
            ? 'You have seen every match'
            : `Showing ${units.length} of ${currentTotal} homes`}
        </div>
      )}
    </div>
  );
}

function homes(count: number) {
  return `${count.toLocaleString()} ${count === 1 ? 'home' : 'homes'}`;
}
