'use client';

import { useState } from 'react';
import UnitListing from './UnitListing';
import UnitFilters from './UnitFilters';

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

export default function UnitSearch() {
  const [filters, setFilters] = useState<FilterState>({});

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  return (
    <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
      <div className='lg:col-span-1'>
        <div className='sticky top-4'>
          <UnitFilters filters={filters} onChange={handleFilterChange} />
        </div>
      </div>
      <div className='lg:col-span-3'>
        <UnitListing filters={filters} />
      </div>
    </div>
  );
}
