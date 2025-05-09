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

  return (
    <main className='min-h-screen'>
      <div className='container mx-auto py-8'>
        <h1 className='text-4xl font-bold mb-8 text-center'>
          Nawy Apartment Listings
        </h1>

        <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
          <div className='md:col-span-1'>
            <UnitFilters filters={filters} onChange={setFilters} />
          </div>

          <div className='md:col-span-3'>
            <UnitListing filters={filters} />
          </div>
        </div>
      </div>
    </main>
  );
}
