'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';

interface HeroCoverProps {
  title?: string;
  subtitle?: string;
  scrollToContent?: () => void;
}

export function HeroCover({
  title = 'Find Your Dream Property in Egypt',
  subtitle = 'Browse through our selection of premium properties in the best locations across Egypt.',
  scrollToContent,
}: HeroCoverProps) {
  return (
    <div className='relative w-full h-[70vh] mb-8'>
      {/* Background image with overlay */}
      <div className='absolute inset-0 z-0'>
        <Image
          src='https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf'
          alt='Luxury property'
          fill
          className='object-cover'
          priority
        />
        <div className='absolute inset-0 bg-black/40' />
      </div>

      {/* Content */}
      <div className='relative z-10 h-full flex flex-col items-center justify-center text-center text-white p-4'>
        <h1 className='text-4xl md:text-5xl lg:text-6xl font-bold mb-4 max-w-4xl'>
          {title}
        </h1>
        <p className='text-lg md:text-xl mb-8 max-w-2xl'>{subtitle}</p>

        {scrollToContent && (
          <Button
            onClick={scrollToContent}
            variant='outline'
            size='lg'
            className='mt-6 border-white text-white hover:bg-white hover:text-black transition-colors'
          >
            Browse Properties
            <ArrowDown className='ml-2 h-4 w-4' />
          </Button>
        )}
      </div>
    </div>
  );
}
