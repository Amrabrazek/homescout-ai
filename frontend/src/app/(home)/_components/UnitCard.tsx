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
  // Get the first image or use a placeholder
  const featuredImage =
    unit.images && unit.images.length > 0
      ? unit.images[0]
      : {
          url: 'https://picsum.photos/400/300?placeholder',
          altText: 'Property placeholder',
        };

  return (
    <Link href={`/unit/${unit.id}`}>
      <Card className='h-full overflow-hidden hover:shadow-lg transition-shadow duration-300'>
        <div className='relative w-full h-48'>
          <Image
            src={featuredImage.url}
            alt={featuredImage.altText || unit.name}
            fill
            className='object-cover'
          />
        </div>
        <CardHeader className='p-4 pb-2'>
          <div className='flex justify-between items-start'>
            <div>
              <CardTitle className='text-lg'>{unit.name}</CardTitle>
              <CardDescription>
                {unit.project.name} | {unit.project.developer.name}
              </CardDescription>
            </div>
            <Badge variant='outline' className='bg-primary/10'>
              {unit.number}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className='p-4 pt-0 pb-2'>
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
        <CardFooter className='p-4 pt-2 border-t'>
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
    <Card className='h-full overflow-hidden'>
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

      <CardContent className='p-4 pt-0 pb-2'>
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

      <CardFooter className='p-4 pt-2 border-t'>
        <div className='w-full flex justify-end'>
          <Skeleton className='h-6 w-24' /> {/* Price */}
        </div>
      </CardFooter>
    </Card>
  );
}
