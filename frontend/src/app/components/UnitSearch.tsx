'use client';

import { useState } from 'react';
import UnitListing from '@/app/components/UnitListing';
import UnitFilters from '@/app/components/UnitFilters';

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
  const [unitCounts, setUnitCounts] = useState({
    total: 0,
    displayed: 0,
  });

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleUnitCountsUpdate = (total: number, displayed: number) => {
    setUnitCounts({ total, displayed });
  };

  return (
    <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
      <div className='lg:col-span-1'>
        <UnitFilters
          filters={filters}
          onChange={handleFilterChange}
          totalUnits={unitCounts.total}
        />
      </div>
      <div className='lg:col-span-3'>
        <UnitListing
          filters={filters}
          onCountsUpdate={handleUnitCountsUpdate}
        />
      </div>
    </div>
  );
}
