'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BedDouble, Building2, ImageIcon, Ruler } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPriceShort } from '@/lib/utils/formatters';
import pathsConfig from '@config/paths.config';
import { differenceInDays } from 'date-fns/differenceInDays';
import { SaveHeart } from './SaveHeart';

type UnitCardProps = {
  unit: {
    id: string;
    name: string;
    floor: number;
    rooms: number;
    floorArea: number;
    price: number;
    createdAt: string;
    project: {
      name: string;
      area?: string;
    };
    images: Array<{
      url: string;
      altText?: string;
    }>;
  };
  saved?: boolean;
};

export default function UnitCard({ unit, saved }: UnitCardProps) {
  const image = unit.images?.[0];
  const isNew = differenceInDays(new Date(), new Date(unit.createdAt)) <= 2;
  const location = [unit.project.name, unit.project.area]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      href={pathsConfig.units.detail.replace('[id]', unit.id)}
      className='group flex flex-col gap-2.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4'
    >
      <div className='relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted'>
        {image ? (
          <Image
            src={image.url}
            alt={image.altText || unit.name}
            fill
            className='object-cover transition-transform duration-300 group-hover:scale-[1.03]'
            sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw'
          />
        ) : (
          <div className='flex h-full w-full items-center justify-center text-muted-foreground'>
            <ImageIcon className='h-10 w-10 opacity-30' />
          </div>
        )}
        {isNew && (
          <span className='absolute left-3 top-3 rounded-md bg-background px-2 py-0.5 text-[11px] font-extrabold tracking-wide'>
            NEW
          </span>
        )}
        <SaveHeart
          unitId={unit.id}
          initialSaved={saved}
          className='absolute right-3 top-3'
        />
      </div>

      <div className='flex flex-col gap-1 px-0.5'>
        <span className='text-lg font-extrabold tracking-tight tabular-nums'>
          {formatPriceShort(unit.price)}
        </span>
        <span className='line-clamp-1 text-sm font-semibold'>{unit.name}</span>
        <span className='line-clamp-1 text-sm text-muted-foreground'>
          {location}
        </span>
        <div className='mt-1 flex gap-3 text-[13px] font-medium text-muted-foreground'>
          <span className='flex items-center gap-1'>
            <BedDouble className='h-3.5 w-3.5' />
            {unit.rooms} beds
          </span>
          <span className='flex items-center gap-1'>
            <Ruler className='h-3.5 w-3.5' />
            {unit.floorArea} m²
          </span>
          <span className='flex items-center gap-1'>
            <Building2 className='h-3.5 w-3.5' />
            {unit.floor ? `Floor ${unit.floor}` : 'Ground'}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function UnitCardSkeleton() {
  return (
    <div className='flex flex-col gap-2.5'>
      <Skeleton className='aspect-[4/3] w-full rounded-2xl' />
      <Skeleton className='h-5 w-28' />
      <Skeleton className='h-4 w-44' />
      <Skeleton className='h-4 w-36' />
      <Skeleton className='h-4 w-48' />
    </div>
  );
}
