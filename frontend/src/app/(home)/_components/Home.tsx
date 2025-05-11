'use client';

import { useEffect, useState } from 'react';
import UnitListing from './UnitListing';
import UnitFilters from './UnitFilters';
import UnitSorter from './UnitSorter';
import {
  UnitSort,
  UnitSortField,
  SortDirection,
  UnitFilter,
} from '@/lib/graphql/units/types';
import { useSearchParams, useRouter } from 'next/navigation';

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Initialize filter and sort states
  const [filters, setFilters] = useState<UnitFilter>({});
  const [sort, setSort] = useState<UnitSort>({
    field: UnitSortField.CREATED_AT,
    direction: SortDirection.DESC,
  });

  // Read URL parameters and initialize state
  useEffect(() => {
    if (!searchParams) return;

    const newFilters: UnitFilter = {};
    const newSort: UnitSort = { ...sort };

    // Helper to get a parameter value, checking different prefixes
    const getParam = (key: string) => {
      // Check with prefix first
      if (searchParams.has(`filters_${key}`)) {
        return searchParams.get(`filters_${key}`);
      }
      // Then check without prefix
      if (searchParams.has(key)) {
        return searchParams.get(key);
      }
      return null;
    };

    // Process string parameters
    const searchTerm = getParam('searchTerm');
    if (searchTerm) newFilters.searchTerm = searchTerm;

    // Process numeric parameters
    const numericParams = [
      'minPrice',
      'maxPrice',
      'minRooms',
      'maxRooms',
      'minFloorArea',
      'maxFloorArea',
    ] as const;

    numericParams.forEach((param) => {
      const value = getParam(param);
      if (value) newFilters[param] = Number(value);
    });

    // Process array parameters
    const projectIds = getParam('projectIds');
    if (projectIds) newFilters.projectIds = projectIds.split(',');

    const amenityIds = getParam('amenityIds');
    if (amenityIds) newFilters.amenityIds = amenityIds.split(',');

    // Process sort parameters
    const sortField =
      searchParams.get('sort_field') || searchParams.get('field');
    if (
      sortField &&
      Object.values(UnitSortField).includes(sortField as UnitSortField)
    ) {
      newSort.field = sortField as UnitSortField;
    }

    const sortDirection =
      searchParams.get('sort_direction') || searchParams.get('direction');
    if (
      sortDirection &&
      Object.values(SortDirection).includes(sortDirection as SortDirection)
    ) {
      newSort.direction = sortDirection as SortDirection;
    }

    // Update state
    setFilters(newFilters);
    setSort(newSort);
    setIsLoading(false);
  }, [searchParams]);

  // Update URL when filters change
  const updateUrl = (newFilters: UnitFilter, newSort: UnitSort) => {
    const params = new URLSearchParams();

    // Add filter parameters
    if (newFilters.searchTerm) params.set('searchTerm', newFilters.searchTerm);
    if (newFilters.minPrice)
      params.set('minPrice', String(newFilters.minPrice));
    if (newFilters.maxPrice)
      params.set('maxPrice', String(newFilters.maxPrice));
    if (newFilters.minRooms)
      params.set('minRooms', String(newFilters.minRooms));
    if (newFilters.maxRooms)
      params.set('maxRooms', String(newFilters.maxRooms));
    if (newFilters.minFloorArea)
      params.set('minFloorArea', String(newFilters.minFloorArea));
    if (newFilters.maxFloorArea)
      params.set('maxFloorArea', String(newFilters.maxFloorArea));

    // Add array parameters
    if (newFilters.projectIds?.length)
      params.set('projectIds', newFilters.projectIds.join(','));
    if (newFilters.amenityIds?.length)
      params.set('amenityIds', newFilters.amenityIds.join(','));

    // Add sort parameters
    if (newSort.field) params.set('field', newSort.field);
    if (newSort.direction) params.set('direction', newSort.direction);

    // Update URL without reloading the page
    const url = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.pushState({}, '', url);
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

  // Show loading state while initializing
  if (isLoading) {
    return (
      <div className='grid grid-cols-1 lg:grid-cols-4 gap-6 animate-pulse'>
        <div className='lg:col-span-1 bg-gray-200 h-[600px] rounded-md'></div>
        <div className='lg:col-span-3 bg-gray-200 h-[600px] rounded-md'></div>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
      <div className='lg:col-span-1'>
        <div className='sticky top-20'>
          <UnitFilters filters={filters} onChange={handleFilterChange} />
        </div>
      </div>
      <div className='lg:col-span-3'>
        <div className='mb-6 flex justify-end'>
          <UnitSorter sort={sort} onSortChange={handleSortChange} />
        </div>
        <UnitListing filters={filters} sort={sort} />
      </div>
    </div>
  );
}
