'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import UnitListing from '@/app/(home)/_components/UnitListing';
import AskHero from './AskHero';
import FilterBar from './FilterBar';
import ForYouRails from './ForYouRails';
import type { HomeFeed } from '@/lib/graphql/feed/types';
import type {
  UnitFilter,
  UnitSort,
  SortDirection,
  UnitSortField,
} from '@/lib/graphql/units/types';

type HomeProps = {
  savedUnitIds: string[];
  feed: HomeFeed | null;
};

export default function Home({ savedUnitIds, feed }: HomeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<UnitFilter>({});
  const [sort, setSort] = useState<UnitSort>({});

  // Initialize from URL on first load
  useEffect(() => {
    const initialFilters = parseFiltersFromUrl();
    const initialSort = parseSortFromUrl();

    setFilters(initialFilters);
    setSort(initialSort);
  }, [searchParams]);

  // Parse filter values from URL search params
  const parseFiltersFromUrl = (): UnitFilter => {
    const filters: UnitFilter = {};

    // Helper to get array of values for a param
    const getParam = (key: string) => {
      const value = searchParams.get(key);
      return value ? value : undefined;
    };

    const getArrayParam = (key: string) => {
      const value = searchParams.getAll(key);
      return value.length > 0 ? value : undefined;
    };

    const getNumberParam = (key: string) => {
      const value = searchParams.get(key);
      return value ? Number(value) : undefined;
    };

    // Extract filter values
    filters.searchTerm = getParam('searchTerm');
    filters.projectIds = getArrayParam('projectId');
    filters.amenityIds = getArrayParam('amenityId');
    filters.minRooms = getNumberParam('minRooms');
    filters.maxRooms = getNumberParam('maxRooms');
    filters.minPrice = getNumberParam('minPrice');
    filters.maxPrice = getNumberParam('maxPrice');
    filters.minFloorArea = getNumberParam('minFloorArea');
    filters.maxFloorArea = getNumberParam('maxFloorArea');

    return filters;
  };

  // Parse sort values from URL
  const parseSortFromUrl = (): UnitSort => {
    const sortField = searchParams.get('sortField') as UnitSortField | null;
    const sortDirection = searchParams.get(
      'sortDirection'
    ) as SortDirection | null;

    const sort: UnitSort = {};

    if (sortField) {
      sort.field = sortField;
    }

    if (sortDirection) {
      sort.direction = sortDirection;
    }

    return sort;
  };

  // Update URL with new filters and sort
  const updateUrl = (newFilters: UnitFilter, newSort: UnitSort) => {
    // Create a new URLSearchParams object
    const params = new URLSearchParams();

    // Add filter params
    if (newFilters.searchTerm) {
      params.set('searchTerm', newFilters.searchTerm);
    }

    if (newFilters.projectIds && newFilters.projectIds.length > 0) {
      newFilters.projectIds.forEach((id) => {
        params.append('projectId', id);
      });
    }

    if (newFilters.amenityIds && newFilters.amenityIds.length > 0) {
      newFilters.amenityIds.forEach((id) => {
        params.append('amenityId', id);
      });
    }

    if (newFilters.minRooms !== undefined) {
      params.set('minRooms', newFilters.minRooms.toString());
    }

    if (newFilters.maxRooms !== undefined) {
      params.set('maxRooms', newFilters.maxRooms.toString());
    }

    if (newFilters.minPrice !== undefined) {
      params.set('minPrice', newFilters.minPrice.toString());
    }

    if (newFilters.maxPrice !== undefined) {
      params.set('maxPrice', newFilters.maxPrice.toString());
    }

    if (newFilters.minFloorArea !== undefined) {
      params.set('minFloorArea', newFilters.minFloorArea.toString());
    }

    if (newFilters.maxFloorArea !== undefined) {
      params.set('maxFloorArea', newFilters.maxFloorArea.toString());
    }

    // Add sort params
    if (newSort.field) {
      params.set('sortField', newSort.field);
    }

    if (newSort.direction) {
      params.set('sortDirection', newSort.direction);
    }

    // Update the URL without reloading the page
    router.push('?' + params.toString(), { scroll: false });
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: UnitFilter) => {
    setFilters(newFilters);
    updateUrl(newFilters, sort);
  };

  // Handle sort changes
  const handleSortChange = (newSort: UnitSort) => {
    setSort(newSort);
    updateUrl(filters, newSort);
  };

  return (
    <>
      <AskHero
        searchTerm={filters.searchTerm}
        onSearch={(searchTerm) =>
          handleFilterChange({ ...filters, searchTerm })
        }
      />
      {feed && !isSearching(filters) && (
        <ForYouRails feed={feed} savedUnitIds={savedUnitIds} />
      )}
      <div id='property-search' className='flex flex-col gap-6 pb-16'>
        <FilterBar
          filters={filters}
          onChange={handleFilterChange}
          sort={sort}
          onSortChange={handleSortChange}
        />
        <UnitListing
          filters={filters}
          sort={sort}
          savedUnitIds={savedUnitIds}
        />
      </div>
    </>
  );
}

const isSearching = (filters: UnitFilter) =>
  Object.values(filters).some((value) =>
    Array.isArray(value) ? value.length > 0 : value != null && value !== ''
  );
