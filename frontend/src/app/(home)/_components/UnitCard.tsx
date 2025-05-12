'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/utils/formatters';
import pathsConfig from '@config/paths.config';
import { ImageIcon } from 'lucide-react';
import { differenceInDays } from 'date-fns/differenceInDays';

type UnitCardProps = {
  unit: {
    id: string;
    name: string;
    number: string;
    floor: number;
    rooms: number;
    bathrooms: number;
    floorArea: number;
    price: number;
    description?: string;
    createdAt: string;
    project: {
      name: string;
      developer: {
        name: string;
      };
    };
    amenities: Array<{
      id: string;
      name: string;
      icon?: string;
    }>;
    images: Array<{
      id: string;
      url: string;
      altText?: string;
    }>;
  };
};

export default function UnitCard({ unit }: UnitCardProps) {
  // Check if the unit has any images
  const hasImages = unit.images && unit.images.length > 0;

  // Check if unit is new (created within the last 2 days)
  const isNew = differenceInDays(new Date(), new Date(unit.createdAt)) <= 2;

  return (
    <Link href={`${pathsConfig.units.detail.replace('[id]', unit.id)}`}>
      <Card className='h-full overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col'>
        <div className='relative w-full h-48'>
          {hasImages ? (
            <Image
              src={unit.images[0].url}
              alt={unit.images[0].altText || unit.name}
              fill
              unoptimized
              className='object-cover'
            />
          ) : (
            <div className='w-full h-full bg-gray-100 flex items-center justify-center'>
              <div className='flex flex-col items-center justify-center text-muted-foreground'>
                <ImageIcon className='w-12 h-12 mb-2 opacity-20' />
                <span className='text-sm'>No image available</span>
              </div>
            </div>
          )}

          {isNew && (
            <div className='absolute top-2 right-2 z-10'>
              <Badge className='bg-green-500 hover:bg-green-600 text-white'>
                NEW
              </Badge>
            </div>
          )}
        </div>
        <CardHeader className='p-4 pb-2'>
          <div className='flex justify-between items-start'>
            <div>
              <CardTitle className='text-lg'>{unit.name}</CardTitle>
              <CardDescription>
                {unit.project.name} | {unit.project.developer.name}
              </CardDescription>
            </div>
            <Badge
              variant='outline'
              className='bg-primary/10 whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]'
            >
              {unit.number.length > 8
                ? `${unit.number.substring(0, 8)}...`
                : unit.number}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className='p-4 pt-0 pb-2 flex-grow'>
          <div className='flex justify-between mb-2 text-sm'>
            <span>{unit.rooms} Rooms</span>
            <span>{unit.bathrooms} Bathrooms</span>
            <span>{unit.floorArea} sqm</span>
          </div>

          {unit.description && (
            <CardDescription
              html={unit.description}
              className='line-clamp-2 text-sm h-10'
            />
          )}

          <div className='mt-2 flex flex-wrap gap-1'>
            {unit.amenities.slice(0, 3).map((amenity) => (
              <Badge key={amenity.id} variant='secondary' className='text-xs'>
                {amenity.name}
              </Badge>
            ))}
            {unit.amenities.length > 3 && (
              <Badge variant='secondary' className='text-xs'>
                +{unit.amenities.length - 3} more
              </Badge>
            )}
          </div>
        </CardContent>
        <CardFooter className='p-4 pt-2 border-t h-[60px] flex items-center'>
          <div className='w-full text-right font-bold text-lg'>
            {formatPrice(unit.price)}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}

// Create a skeleton version of the card that exactly matches the structure
export function UnitCardSkeleton() {
  return (
    <Card className='h-full overflow-hidden flex flex-col'>
      {/* Image placeholder */}
      <div className='relative w-full h-48'>
        <Skeleton className='h-full w-full' />
      </div>

      <CardHeader className='p-4 pb-2'>
        <div className='flex justify-between items-start'>
          <div>
            <Skeleton className='h-6 w-32 mb-2' /> {/* Title */}
            <Skeleton className='h-4 w-48' /> {/* Description */}
          </div>
          <Skeleton className='h-6 w-16 rounded-full' /> {/* Badge */}
        </div>
      </CardHeader>

      <CardContent className='p-4 pt-0 pb-2 flex-grow'>
        <div className='flex justify-between mb-2'>
          <Skeleton className='h-4 w-16' /> {/* Rooms */}
          <Skeleton className='h-4 w-20' /> {/* Bathrooms */}
          <Skeleton className='h-4 w-16' /> {/* Area */}
        </div>
        <Skeleton className='h-10 w-full mb-3' /> {/* Description */}
        <div className='flex gap-1'>
          <Skeleton className='h-5 w-16 rounded-full' /> {/* Amenity */}
          <Skeleton className='h-5 w-16 rounded-full' /> {/* Amenity */}
          <Skeleton className='h-5 w-16 rounded-full' /> {/* Amenity */}
        </div>
      </CardContent>

      <CardFooter className='p-4 pt-2 border-t h-[60px] flex items-center'>
        <div className='w-full flex justify-end'>
          <Skeleton className='h-6 w-24' /> {/* Price */}
        </div>
      </CardFooter>
    </Card>
  );
}
