'use client';

import UnitListing from '@/app/components/UnitListing';
import UnitFilters from '@/app/components/UnitFilters';
import { useState } from 'react';

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
    <main className='min-h-screen bg-gray-50'>
      <div className='container mx-auto py-8'>
        <h1 className='text-3xl font-bold mb-6'>Find Your Dream Property</h1>
        <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
          <div className='lg:col-span-1'>
            <UnitFilters
              filters={filters}
              onChange={handleFilterChange}
              totalUnits={unitCounts.total}
              displayedUnits={unitCounts.displayed}
            />
          </div>
          <div className='lg:col-span-3'>
            <UnitListing
              filters={filters}
              onCountsUpdate={handleUnitCountsUpdate}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
