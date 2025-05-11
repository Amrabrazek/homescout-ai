'use client';

import { useState } from 'react';
import UnitListing from './UnitListing';
import UnitFilters from './UnitFilters';
import UnitSorter from './UnitSorter';
import {
  UnitSort,
  UnitSortField,
  SortDirection,
} from '@/lib/graphql/units/types';

type FilterState = {
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

export default function Home() {
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<UnitSort>({
    field: UnitSortField.CREATED_AT,
    direction: SortDirection.DESC,
  });

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleSortChange = (newSort: UnitSort) => {
    setSort(newSort);
  };

  return (
    <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
      <div className='lg:col-span-1'>
        <div className='sticky top-4'>
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
