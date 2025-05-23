import { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils/ui';
import ImageLightbox from './image-lightbox';
import { ImageIcon } from 'lucide-react';

export default function ImagesGallery({ images }: { images: string[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [openLightbox, setOpenLightbox] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    containScroll: 'keepSnaps',
  });
  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
    containScroll: 'keepSnaps',
    dragFree: true,
    axis: 'x',
  });

  const onThumbClick = useCallback(
    (index: number) => {
      if (!emblaApi || !emblaThumbsApi) return;
      emblaApi.scrollTo(index);
    },
    [emblaApi, emblaThumbsApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi || !emblaThumbsApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaThumbsApi.scrollTo(emblaApi.selectedScrollSnap());
  }, [emblaApi, emblaThumbsApi, setSelectedIndex]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();

    emblaApi.on('select', onSelect).on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  if (!images || images.length === 0) {
    return (
      <div className='flex h-[450px] items-center justify-center rounded-md bg-gray-100'>
        <div className='w-full h-full bg-gray-100 flex items-center justify-center'>
          <div className='flex flex-col items-center justify-center text-muted-foreground'>
            <ImageIcon className='w-12 h-12 mb-2 opacity-20' />
            <span className='text-sm'>No image available</span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className='col-span-12 w-full lg:col-span-7'>
      <div className='sticky top-10 lg:block'>
        <div className='flex flex-col gap-2'>
          <div className='h-[450px] w-full overflow-hidden rounded-md'>
            <div ref={emblaRef} className='embla h-full'>
              <div className='embla__container flex h-full'>
                {images?.map((image, i) => (
                  <div
                    key={i}
                    className='relative w-full shrink-0 basis-full overflow-hidden'
                    style={{
                      backgroundColor: '#fff',
                      filter: 'brightness(0.95)',
                    }}
                  >
                    <img
                      src={image}
                      className='absolute left-0 top-0 h-full w-full rounded-md object-cover'
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className='hidden md:block'>
            <div className='flex gap-2' ref={emblaThumbsRef}>
              {images?.map((image, i) => (
                <div
                  onClick={() => onThumbClick(i)}
                  key={i}
                  className={cn('relative cursor-pointer', {
                    'rounded-md border border-black': i === selectedIndex,
                  })}
                  style={{ width: '82px', height: '82px' }}
                >
                  <img
                    src={image}
                    className='absolute left-0 top-0 h-full w-full rounded-md object-cover'
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <ImageLightbox
          index={selectedIndex}
          images={images}
          isOpen={openLightbox}
          onClose={() => {
            setOpenLightbox(false);
          }}
        />
      </div>
    </div>
  );
}
