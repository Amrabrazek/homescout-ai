'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { DogIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice, formatArea } from '@/lib/utils/formatters';
import {
  ArrowLeft,
  Bed,
  Bath,
  Home,
  Info,
  MessageSquare,
  ImageIcon,
  Pencil,
} from 'lucide-react';
import { CardDescription } from '@/components/ui/card';
import { Unit } from '@/lib/graphql/units/types';
import pathsConfig from '@config/paths.config';
import ImagesGallery from '@/components/ui/images-gallery';
import ContactModal from './ContactModal';
import { SimilarUnits } from './SimilarUnits';

type UnitDetailsProps = {
  unit: Unit;
};

export default function UnitDetails({ unit }: UnitDetailsProps) {
  const [contactModalOpen, setContactModalOpen] = useState(false);

  return (
    <div className='container mx-auto py-8'>
      <Button variant='ghost' asChild className='mb-6 pl-0'>
        <Link href={pathsConfig.home.index} className='flex items-center gap-2'>
          <ArrowLeft size={16} />
          Back to Listings
        </Link>
      </Button>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
        {/* Left: Images and Details */}
        <div className='md:col-span-2 space-y-6'>
          {/* Main Image */}
          {unit.images && unit.images.length > 0 ? (
            <ImagesGallery
              images={unit.images.map((image: any) => image.url)}
            />
          ) : (
            <div className='w-full h-full bg-gray-100 flex items-center justify-center'>
              <div className='flex flex-col items-center justify-center text-muted-foreground'>
                <ImageIcon className='w-12 h-12 mb-2 opacity-20' />
                <span className='text-sm'>No image available</span>
              </div>
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
            <div className='flex justify-between items-start'>
              <h1 className='text-2xl font-bold mb-1'>{unit.name}</h1>
              <Button
                variant='outline'
                size='default'
                className='rounded-full p-2 bg-primary text-white hover:bg-primary/90 flex items-center gap-1'
                asChild
              >
                <Link href={`/dashboard/units/${unit.id}`}>
                  <Pencil size={20} className='mr-1' /> Edit
                </Link>
              </Button>
            </div>
            <div className='text-gray-600 mb-3'>
              {unit.project.name} | {unit.project.developer.name}
            </div>

            <div className='flex items-center gap-3 mb-6'>
              <Badge>{unit.number}</Badge>
              <Badge variant='outline'>Floor {unit.floor}</Badge>
            </div>

            <div className='flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-0 mb-6'>
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

            <Button
              className='w-full mt-6'
              onClick={() => setContactModalOpen(true)}
            >
              Contact Agent
            </Button>
            <Button
              variant='outline'
              className='w-full mt-3 bg-green-500 hover:bg-green-600 text-white border-0'
              onClick={() =>
                window.open(`https://wa.me/201099902278`, '_blank')
              }
            >
              <MessageSquare size={18} className='mr-2' />
              WhatsApp Agent
            </Button>
          </div>
        </div>
      </div>

      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        unitId={unit.id}
        unitName={unit.name}
      />

      {/* Similar Units Section */}
      <SimilarUnits unitId={unit.id} limit={4} />
    </div>
  );
}

export function UnitDetailSkeleton() {
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
