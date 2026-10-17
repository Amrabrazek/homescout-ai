'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, MessageCircle, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/ui';
import pathsConfig from '@/config/paths.config';
import {
  useRejectSearchGuess,
  useUnderstandSearch,
} from '@/lib/graphql/units/hooks';
import type { ParsedSearch } from '@/lib/graphql/units/types';
import { formatPriceShort } from '@/lib/utils/formatters';
import { propertyTypeLabel } from '@/components/concierge/format';
import type { PropertyType } from '@/lib/concierge/types';

const EXAMPLES = [
  '3 bedrooms in New Cairo under 12M',
  'Chalet in Ain Sokhna under 10M',
  'Penthouse in Sheikh Zayed',
];

type Chip = { label: string; group?: string };

/** One chip per parsed filter group, so removing a chip drops that group. */
function understood(parsed: ParsedSearch): Chip[] {
  const chips: Chip[] = [];
  const add = (group: string, label?: string) => {
    if (label) chips.push({ label, group });
  };
  const { minRooms, maxRooms, minPrice, maxPrice } = parsed;
  if (minRooms != null && minRooms === maxRooms)
    add('rooms', `${minRooms} beds`);
  else if (minRooms != null && maxRooms != null)
    add('rooms', `${minRooms}–${maxRooms} beds`);
  else if (minRooms != null) add('rooms', `${minRooms}+ beds`);
  else if (maxRooms != null) add('rooms', `up to ${maxRooms} beds`);
  if (minPrice != null && maxPrice != null)
    add(
      'price',
      `${formatPriceShort(minPrice)} to ${formatPriceShort(maxPrice)}`
    );
  else if (maxPrice != null) add('price', `under ${formatPriceShort(maxPrice)}`);
  else if (minPrice != null) add('price', `over ${formatPriceShort(minPrice)}`);
  const { minFloorArea, maxFloorArea, minFloor, maxFloor } = parsed;
  if (minFloorArea != null && maxFloorArea != null)
    add('size', `${minFloorArea}–${maxFloorArea} m²`);
  else if (minFloorArea != null) add('size', `${minFloorArea}+ m²`);
  else if (maxFloorArea != null) add('size', `up to ${maxFloorArea} m²`);
  if (maxFloor === 0) add('floor', 'ground floor');
  else if (minFloor != null && minFloor === maxFloor)
    add('floor', `floor ${minFloor}`);
  else if (minFloor === 1 && maxFloor == null) add('floor', 'not ground floor');
  else if (minFloor != null) add('floor', `floor ${minFloor}+`);
  else if (maxFloor != null) add('floor', `up to floor ${maxFloor}`);
  add(
    'type',
    (parsed.propertyTypes ?? [])
      .map((type) => propertyTypeLabel(type.toLowerCase() as PropertyType))
      .join(', ')
  );
  add(
    'place',
    [
      ...(parsed.areas ?? []),
      ...(parsed.cities ?? []),
      ...(parsed.regions ?? []),
    ].join(', ')
  );
  if (parsed.excludeAmenities?.length)
    add('excluded', `no ${parsed.excludeAmenities.join(', ')}`);
  if (chips.length && parsed.text) chips.push({ label: `“${parsed.text}”` });
  return chips;
}

type AskHeroProps = {
  searchTerm?: string;
  /** Parsed filter groups the buyer removed. */
  ignore?: string[];
  onSearch: (searchTerm: string | undefined) => void;
  onRemove: (group: string) => void;
};

export default function AskHero({
  searchTerm,
  ignore,
  onSearch,
  onRemove,
}: AskHeroProps) {
  const [value, setValue] = useState(searchTerm ?? '');
  const parsed = useUnderstandSearch(searchTerm, ignore);
  const rejectGuess = useRejectSearchGuess();
  const chips = parsed ? understood(parsed) : [];

  const remove = (group: string) => {
    if (searchTerm && parsed?.guessed.includes(group)) rejectGuess(searchTerm);
    onRemove(group);
  };

  useEffect(() => setValue(searchTerm ?? ''), [searchTerm]);

  const submit = (term: string) => onSearch(term.trim() || undefined);

  return (
    <section className='grid gap-8 py-8 md:py-12 lg:grid-cols-[1.3fr_1fr] lg:items-center'>
      <div className='min-w-0'>
        <h1 className='text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl'>
          Tell us how you live.
          <br />
          <span className='text-primary'>We&apos;ll find the home.</span>
        </h1>
        <p className='mt-4 max-w-[46ch] text-base text-muted-foreground md:text-lg'>
          Describe it the way you&apos;d tell a friend. HomeScout turns it into
          filters, searches by meaning, and learns from what you save.
        </p>

        <form
          role='search'
          onSubmit={(e) => {
            e.preventDefault();
            submit(value);
          }}
          className='mt-6 flex items-center gap-2 rounded-2xl border-[1.5px] border-foreground bg-background p-2 pl-4 shadow-lg shadow-foreground/5 focus-within:ring-2 focus-within:ring-ring'
        >
          <Sparkles className='h-5 w-5 shrink-0 text-primary' />
          <label htmlFor='ask' className='sr-only'>
            Describe the home you want
          </label>
          <input
            id='ask'
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder='3 bedrooms in New Cairo, under 12M'
            className='min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground'
          />
          {searchTerm && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              aria-label='Clear search'
              onClick={() => submit('')}
            >
              <X />
            </Button>
          )}
          <Button type='submit' className='h-10 rounded-xl px-5 font-bold'>
            Search
          </Button>
        </form>

        <div className='mt-3 flex flex-wrap items-center gap-2 text-sm'>
          {searchTerm && parsed && !chips.length ? (
            <span className='flex items-center gap-1.5 text-muted-foreground'>
              <Sparkles className='h-4 w-4' />
              Searching by meaning
            </span>
          ) : searchTerm && parsed ? (
            <>
              <span className='font-semibold text-muted-foreground'>
                Understood as
              </span>
              {chips.map(({ label, group }) => {
                const guess = !!group && parsed.guessed.includes(group);
                return (
                  <span
                    key={label}
                    title={
                      guess
                        ? 'Guessed by AI. Remove it if it is wrong.'
                        : undefined
                    }
                    className={cn(
                      'flex items-center gap-1 rounded-full bg-accent py-1 pl-3 font-semibold text-accent-foreground',
                      group ? 'pr-1' : 'pr-3',
                      guess && 'border border-dashed border-primary'
                    )}
                  >
                    {guess && <Sparkles className='h-3.5 w-3.5' />}
                    {label}
                    {guess && <span className='sr-only'>(AI guess)</span>}
                    {group && (
                      <button
                        type='button'
                        aria-label={`Remove ${label}`}
                        onClick={() => remove(group)}
                        className='grid h-5 w-5 place-items-center rounded-full hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                      >
                        <X className='h-3.5 w-3.5' />
                      </button>
                    )}
                  </span>
                );
              })}
            </>
          ) : (
            !searchTerm && (
              <>
                <span className='font-semibold text-muted-foreground'>Try</span>
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type='button'
                    onClick={() => submit(example)}
                    className='rounded-full border bg-secondary px-3 py-1 font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  >
                    {example}
                  </button>
                ))}
              </>
            )
          )}
        </div>
      </div>

      <Link
        href={pathsConfig.home.concierge}
        className='group hidden flex-col gap-4 rounded-3xl lg:flex bg-secondary p-6 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      >
        <span className='flex items-center gap-2 font-bold'>
          <span className='grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground'>
            <MessageCircle className='h-4 w-4' />
          </span>
          Concierge
        </span>
        <span className='self-end rounded-2xl bg-foreground px-4 py-2.5 text-sm text-background'>
          A 3-bedroom in New Cairo under 12M with a garden
        </span>
        <span className='rounded-2xl border bg-background px-4 py-3 text-sm leading-relaxed'>
          Ask in your own words. The concierge searches real units, compares
          them side by side and explains why each one fits.
        </span>
        <span className='flex items-center gap-1 text-sm font-bold text-primary'>
          Start a conversation
          <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
        </span>
      </Link>
    </section>
  );
}
