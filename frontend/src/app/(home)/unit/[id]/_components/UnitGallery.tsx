'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { Grid2x2, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils/ui';
import ImageLightbox from '@/components/ui/image-lightbox';
import type { Image as UnitImage } from '@/lib/graphql/units/types';

type UnitGalleryProps = {
  images: UnitImage[];
  name: string;
  /** Overlay in the top-right corner, e.g. the save heart. */
  action?: React.ReactNode;
};

/** Photo grid on desktop (1 large + 4 small), swipeable carousel on phones. */
export function UnitGallery({ images, name, action }: UnitGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel();

  const onSelect = useCallback(() => {
    if (emblaApi) setCurrent(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  if (images.length === 0) {
    return (
      <div className='relative flex aspect-[16/9] max-h-[440px] w-full items-center justify-center rounded-2xl bg-muted text-muted-foreground'>
        <ImageIcon className='h-12 w-12 opacity-30' />
        {action && <div className='absolute right-4 top-4'>{action}</div>}
      </div>
    );
  }

  const alt = (i: number) => images[i].altText || `${name}, photo ${i + 1}`;
  const grid = images.slice(0, 5);

  return (
    <div className='relative'>
      <div className='overflow-hidden rounded-2xl md:hidden' ref={emblaRef}>
        <div className='flex'>
          {images.map((image, i) => (
            <button
              key={image.id}
              type='button'
              onClick={() => setLightboxIndex(i)}
              className='relative aspect-[4/3] w-full shrink-0 basis-full'
            >
              <Image
                src={image.url}
                alt={alt(i)}
                fill
                priority={i === 0}
                sizes='100vw'
                className='object-cover'
              />
            </button>
          ))}
        </div>
      </div>
      <span className='absolute bottom-3 right-3 rounded-md bg-foreground/75 px-2 py-0.5 text-xs font-semibold text-background tabular-nums md:hidden'>
        {current + 1} / {images.length}
      </span>

      <div
        className={cn(
          'hidden h-[440px] gap-2 overflow-hidden rounded-2xl md:grid',
          grid.length === 1 ? 'grid-cols-1' : 'grid-cols-4 grid-rows-2'
        )}
      >
        {grid.map((image, i) => (
          <button
            key={image.id}
            type='button'
            onClick={() => setLightboxIndex(i)}
            className={cn(
              'group relative overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              i === 0 && grid.length > 1 && 'col-span-2 row-span-2',
              grid.length === 2 && 'col-span-2 row-span-2',
              grid.length === 3 && i > 0 && 'col-span-2',
              grid.length === 4 && i === 3 && 'col-span-2'
            )}
          >
            <Image
              src={image.url}
              alt={alt(i)}
              fill
              priority={i === 0}
              sizes={i === 0 ? '50vw' : '25vw'}
              className='object-cover transition duration-300 group-hover:brightness-90'
            />
          </button>
        ))}
      </div>
      {images.length > 1 && (
        <button
          type='button'
          onClick={() => setLightboxIndex(0)}
          className='absolute bottom-4 right-4 hidden items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm font-semibold shadow-sm transition hover:bg-muted md:flex'
        >
          <Grid2x2 className='h-4 w-4' />
          Show all {images.length} photos
        </button>
      )}

      {action && <div className='absolute right-4 top-4'>{action}</div>}

      <ImageLightbox
        index={lightboxIndex ?? 0}
        images={images.map((image) => image.url)}
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}
