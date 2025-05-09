'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import Image from 'next/image';
import Link from 'next/link';
import { DogIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice, formatArea } from '@/app/utils/formatter';
import { ArrowLeft, Bed, Bath, Home, Info } from 'lucide-react';
import { CardDescription } from '@/components/ui/card';

const GET_UNIT = gql`
  query GetUnit($id: String!) {
    unit(id: $id) {
      id
      name
      number
      floor
      rooms
      bathrooms
      floorArea
      price
      description
      project {
        id
        name
        developer {
          id
          name
        }
      }
      amenities {
        id
        name
        icon
      }
      images {
        id
        url
        altText
      }
    }
  }
`;

export default function UnitDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, loading, error } = useQuery(GET_UNIT, {
    variables: { id },
  });

  if (loading) {
    return <UnitDetailSkeleton />;
  }

  if (error) {
    return (
      <div className='container mx-auto py-10 text-center'>
        <p className='text-red-500'>Error loading unit: {error.message}</p>
        <Button asChild className='mt-6'>
          <Link href='/'>Back to Listings</Link>
        </Button>
      </div>
    );
  }

  const unit = data?.unit;

  if (!unit) {
    return (
      <div className='container mx-auto py-10 text-center'>
        <h1 className='text-2xl font-bold mb-6'>Unit Not Found</h1>
        <p>The unit you're looking for doesn't exist or has been removed.</p>
        <Button asChild className='mt-6'>
          <Link href='/'>Back to Listings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className='container mx-auto py-8'>
      <Button variant='ghost' asChild className='mb-6 pl-0'>
        <Link href='/' className='flex items-center gap-2'>
          <ArrowLeft size={16} />
          Back to Listings
        </Link>
      </Button>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
        {/* Left: Images and Details */}
        <div className='md:col-span-2 space-y-6'>
          {/* Main Image */}
          <div className='relative w-full h-[400px] rounded-lg overflow-hidden'>
            {unit.images && unit.images.length > 0 ? (
              <Image
                src={unit.images[0].url}
                alt={unit.images[0].altText || unit.name}
                fill
                className='object-cover'
              />
            ) : (
              <div className='w-full h-full bg-gray-200 flex items-center justify-center'>
                <Info size={48} className='text-gray-400' />
              </div>
            )}
          </div>

          {/* Image Gallery */}
          {unit.images && unit.images.length > 1 && (
            <div className='grid grid-cols-4 gap-2'>
              {unit.images.slice(1, 5).map((image: any) => (
                <div
                  key={image.id}
                  className='relative h-24 rounded overflow-hidden'
                >
                  <Image
                    src={image.url}
                    alt={image.altText || 'Property image'}
                    fill
                    className='object-cover'
                  />
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div className='bg-white p-6 rounded-lg shadow-sm'>
            <h2 className='font-semibold text-lg mb-3'>Description</h2>
            {unit.description ? (
              <CardDescription
                html={unit.description}
                className='text-gray-700'
              />
            ) : (
              <p className='text-gray-700'>
                No description available for this property.
              </p>
            )}
          </div>

          {/* Amenities */}
          <div className='bg-white p-6 rounded-lg shadow-sm'>
            <h2 className='font-semibold text-lg mb-4'>Amenities</h2>
            <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
              {unit.amenities.map((amenity: any) => (
                <div key={amenity.id} className='flex items-center gap-2'>
                  <Badge variant='outline' className='p-1.5'>
                    {amenity.icon ? (
                      <span
                        className='mr-1'
                        dangerouslySetInnerHTML={{ __html: amenity.icon }}
                      />
                    ) : (
                      <DogIcon size={16} className='mr-1' />
                    )}
                  </Badge>
                  <span>{amenity.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Price and Info */}
        <div className='space-y-6'>
          <div className='bg-white p-6 rounded-lg shadow-sm'>
            <h1 className='text-2xl font-bold mb-1'>{unit.name}</h1>
            <div className='text-gray-600 mb-3'>
              {unit.project.name} | {unit.project.developer.name}
            </div>

            <div className='flex items-center gap-3 mb-6'>
              <Badge>{unit.number}</Badge>
              <Badge variant='outline'>Floor {unit.floor}</Badge>
            </div>

            <div className='flex justify-between mb-6'>
              <div className='flex items-center gap-2'>
                <Bed size={20} />
                <span>{unit.rooms} Rooms</span>
              </div>
              <div className='flex items-center gap-2'>
                <Bath size={20} />
                <span>{unit.bathrooms} Bathrooms</span>
              </div>
              <div className='flex items-center gap-2'>
                <Home size={20} />
                <span>{formatArea(unit.floorArea)}</span>
              </div>
            </div>

            <div className='mt-6 border-t pt-6'>
              <div className='text-gray-600 mb-1'>Price</div>
              <div className='text-3xl font-bold'>
                {formatPrice(unit.price)}
              </div>
            </div>

            <Button className='w-full mt-6'>Contact Agent</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UnitDetailSkeleton() {
  return (
    <div className='container mx-auto py-8'>
      <div className='h-10 w-32 mb-6'>
        <Skeleton className='h-full w-full' />
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
        <div className='md:col-span-2 space-y-6'>
          <Skeleton className='w-full h-[400px] rounded-lg' />

          <div className='grid grid-cols-4 gap-2'>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className='h-24 rounded' />
            ))}
          </div>

          <div className='bg-white p-6 rounded-lg shadow-sm'>
            <Skeleton className='h-6 w-32 mb-3' />
            <Skeleton className='h-4 w-full mb-2' />
            <Skeleton className='h-4 w-full mb-2' />
            <Skeleton className='h-4 w-3/4' />
          </div>

          <div className='bg-white p-6 rounded-lg shadow-sm'>
            <Skeleton className='h-6 w-32 mb-4' />
            <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className='h-8 w-full' />
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className='bg-white p-6 rounded-lg shadow-sm'>
            <Skeleton className='h-8 w-3/4 mb-2' />
            <Skeleton className='h-4 w-full mb-3' />
            <Skeleton className='h-6 w-1/3 mb-6' />

            <div className='flex justify-between mb-6'>
              <Skeleton className='h-6 w-20' />
              <Skeleton className='h-6 w-20' />
              <Skeleton className='h-6 w-20' />
            </div>

            <Skeleton className='h-4 w-1/4 mb-1 mt-6' />
            <Skeleton className='h-10 w-1/2 mb-6' />

            <Skeleton className='h-10 w-full' />
          </div>
        </div>
      </div>
    </div>
  );
}
