'use client';

import { useQuery } from '@apollo/client';
import { SIMILAR_UNITS_QUERY } from '@/lib/graphql/units/queries';
import { Unit } from '@/lib/graphql/units/types';
import Link from 'next/link';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageIcon } from 'lucide-react';

interface SimilarUnitsProps {
  unitId: string;
  limit?: number;
}

export function SimilarUnits({ unitId, limit = 4 }: SimilarUnitsProps) {
  const { data, loading, error } = useQuery(SIMILAR_UNITS_QUERY, {
    variables: { unitId, limit },
  });

  if (error) {
    console.error('Error loading similar units:', error);
    return null;
  }

  if (loading) {
    return (
      <div className='mt-12'>
        <h2 className='text-2xl font-bold mb-6'>Similar Units</h2>
        <div className='flex overflow-x-auto pb-4 gap-4 hide-scrollbar'>
          {Array.from({ length: limit }).map((_, i) => (
            <SimilarUnitSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.similarUnits || data.similarUnits.length === 0) {
    return null;
  }

  return (
    <div className='mt-12'>
      <h2 className='text-2xl font-bold mb-6'>Similar Units</h2>
      <div className='flex overflow-x-auto pb-4 gap-4 hide-scrollbar'>
        {data.similarUnits.map((unit: Unit) => (
          <SimilarUnitCard key={unit.id} unit={unit} />
        ))}
      </div>
    </div>
  );
}

function SimilarUnitCard({ unit }: { unit: Unit }) {
  const hasImage = unit.images && unit.images.length > 0;
  const imageUrl = hasImage ? unit.images[0].url : '/placeholder-unit.jpg';

  return (
    <Link
      href={`/unit/${unit.id}`}
      className='bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow flex-shrink-0 w-[280px]'
    >
      <div className='relative h-48 w-full'>
        {hasImage ? (
          <Image
            src={imageUrl}
            alt={unit.name}
            fill
            className='object-cover'
            sizes='280px'
          />
        ) : (
          <div className='w-full h-full bg-gray-100 flex items-center justify-center'>
            <div className='flex flex-col items-center justify-center text-muted-foreground'>
              <ImageIcon className='w-12 h-12 mb-2 opacity-20' />
              <span className='text-sm'>No image available</span>
            </div>
          </div>
        )}
      </div>
      <div className='p-4'>
        <h3 className='font-semibold text-lg truncate'>{unit.name}</h3>
        <p className='text-gray-500 text-sm'>
          {unit.project?.name || 'Unknown Project'}
        </p>
        <div className='flex justify-between mt-2'>
          <span className='text-sm'>{unit.rooms} BR</span>
          <span className='text-sm'>{unit.bathrooms} Bath</span>
          <span className='text-sm'>{unit.floorArea} m²</span>
        </div>
        <p className='font-bold mt-3'>
          ${unit.price?.toLocaleString() || 'Price on request'}
        </p>
      </div>
    </Link>
  );
}

function SimilarUnitSkeleton() {
  return (
    <div className='bg-white rounded-lg shadow-sm overflow-hidden flex-shrink-0 w-[280px]'>
      <Skeleton className='h-48 w-full' />
      <div className='p-4'>
        <Skeleton className='h-5 w-3/4 mb-2' />
        <Skeleton className='h-4 w-1/2 mb-3' />
        <div className='flex justify-between mb-3'>
          <Skeleton className='h-4 w-12' />
          <Skeleton className='h-4 w-12' />
          <Skeleton className='h-4 w-12' />
        </div>
        <Skeleton className='h-5 w-1/3' />
      </div>
    </div>
  );
}
