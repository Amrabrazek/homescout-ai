'use client';

import { useState } from 'react';
import { Share2, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';
import { formatPriceShort } from '@/lib/utils/formatters';
import type { UnitFilter, UnitSort } from '@/lib/graphql/units/types';
import UnitFilters from './UnitFilters';
import UnitSorter from './UnitSorter';

type Chip = { key: string; label: string; clear: Partial<UnitFilter> };

function range(
  min: number | undefined,
  max: number | undefined,
  format: (n: number) => string
) {
  if (min != null && max != null)
    return min === max ? format(min) : `${format(min)} to ${format(max)}`;
  if (min != null) return `${format(min)}+`;
  if (max != null) return `up to ${format(max)}`;
  return null;
}

function activeChips(filters: UnitFilter): Chip[] {
  const chips: Chip[] = [];
  const price = range(filters.minPrice, filters.maxPrice, (n) =>
    formatPriceShort(n)
  );
  if (price)
    chips.push({
      key: 'price',
      label: price,
      clear: { minPrice: undefined, maxPrice: undefined },
    });
  const beds = range(filters.minRooms, filters.maxRooms, String);
  if (beds)
    chips.push({
      key: 'rooms',
      label: `${beds} beds`,
      clear: { minRooms: undefined, maxRooms: undefined },
    });
  const area = range(filters.minFloorArea, filters.maxFloorArea, String);
  if (area)
    chips.push({
      key: 'area',
      label: `${area} m²`,
      clear: { minFloorArea: undefined, maxFloorArea: undefined },
    });
  const projects = filters.projectIds?.length ?? 0;
  if (projects)
    chips.push({
      key: 'projects',
      label: projects === 1 ? '1 project' : `${projects} projects`,
      clear: { projectIds: undefined },
    });
  const amenities = filters.amenityIds?.length ?? 0;
  if (amenities)
    chips.push({
      key: 'amenities',
      label: amenities === 1 ? '1 amenity' : `${amenities} amenities`,
      clear: { amenityIds: undefined },
    });
  return chips;
}

type FilterBarProps = {
  filters: UnitFilter;
  onChange: (filters: UnitFilter) => void;
  sort: UnitSort;
  onSortChange: (sort: UnitSort) => void;
};

export default function FilterBar({
  filters,
  onChange,
  sort,
  onSortChange,
}: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const isPhone = useMediaQuery('(max-width: 767px)');
  const chips = activeChips(filters);

  const share = () =>
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast.success('Link copied'))
      .catch(() => toast.error('Could not copy the link'));

  return (
    <div className='flex flex-wrap items-center gap-2 border-y py-3'>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant={chips.length ? 'default' : 'outline'}
            className='h-9 rounded-full px-4 font-semibold'
          >
            <SlidersHorizontal />
            Filters{chips.length ? ` · ${chips.length}` : ''}
          </Button>
        </SheetTrigger>
        <SheetContent
          side={isPhone ? 'bottom' : 'right'}
          className={
            isPhone
              ? 'flex max-h-[85vh] flex-col rounded-t-2xl p-0'
              : 'flex w-full flex-col p-0 sm:max-w-md'
          }
        >
          <SheetHeader className='border-b px-6 py-4 text-left'>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className='flex-1 overflow-y-auto px-6 py-4'>
            <UnitFilters filters={filters} onChange={onChange} />
          </div>
          <SheetFooter className='flex-row gap-2 border-t px-6 py-4 sm:justify-between'>
            <Button
              variant='ghost'
              onClick={() => onChange({ searchTerm: filters.searchTerm })}
            >
              Clear filters
            </Button>
            <Button onClick={() => setOpen(false)}>Show homes</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {chips.map((chip) => (
        <button
          key={chip.key}
          type='button'
          onClick={() => onChange({ ...filters, ...chip.clear })}
          className='flex h-9 items-center gap-1.5 rounded-full border bg-secondary px-3 text-sm font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          aria-label={`Remove ${chip.label}`}
        >
          {chip.label}
          <X className='h-3.5 w-3.5 opacity-60' />
        </button>
      ))}

      <div className='ml-auto flex items-center gap-1'>
        <Button
          variant='ghost'
          size='sm'
          onClick={share}
          className='rounded-full text-muted-foreground'
        >
          <Share2 />
          <span className='hidden sm:inline'>Share</span>
        </Button>
        <UnitSorter
          sort={sort}
          onSortChange={onSortChange}
          searching={!!filters.searchTerm?.trim()}
        />
      </div>
    </div>
  );
}
