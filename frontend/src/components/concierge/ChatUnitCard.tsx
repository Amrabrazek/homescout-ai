'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Bookmark, BookmarkCheck, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createPath } from '@/config/paths.config';
import pathsConfig from '@/config/paths.config';
import type { UnitCard } from '@/lib/concierge/types';
import { formatEgp, propertyTypeLabel } from './format';

/** Drawn from a tool result, never from model text, so every value is from the DB. */
export function ChatUnitCard({
  unit,
  reasons,
  saved: initiallySaved = false,
}: {
  unit: UnitCard;
  reasons?: string[];
  saved?: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [saving, setSaving] = useState(false);
  const href = createPath(pathsConfig.units.detail, { id: unit.id });

  async function save() {
    setSaving(true);
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ unitId: unit.id, type: 'save' }),
    }).catch(() => null);
    setSaving(false);
    if (response?.ok) setSaved(true);
    else toast.error('Could not save this unit');
  }

  return (
    <div className='flex gap-3 rounded-lg border bg-white p-2 text-sm shadow-sm'>
      <Link
        href={href}
        className='relative h-20 w-24 shrink-0 overflow-hidden rounded-md bg-gray-100'
      >
        {unit.imageUrl ? (
          <Image
            src={unit.imageUrl}
            alt={unit.name}
            fill
            sizes='96px'
            className='object-cover'
          />
        ) : (
          <ImageIcon className='m-auto mt-6 h-8 w-8 opacity-20' />
        )}
      </Link>
      <div className='min-w-0 flex-1'>
        <div className='flex items-start justify-between gap-2'>
          <Link href={href} className='min-w-0 hover:underline'>
            <div className='truncate font-medium'>{unit.name}</div>
            <div className='truncate text-xs text-muted-foreground'>
              {[unit.project, unit.area].filter(Boolean).join(' · ')}
            </div>
          </Link>
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 shrink-0'
            onClick={save}
            disabled={saved || saving}
            aria-label={saved ? 'Saved' : 'Save unit'}
            title={saved ? 'Saved' : 'Save'}
          >
            {saved ? (
              <BookmarkCheck className='h-4 w-4 text-primary' />
            ) : (
              <Bookmark className='h-4 w-4' />
            )}
          </Button>
        </div>
        <div className='font-semibold'>{formatEgp(unit.price)}</div>
        <div className='text-xs text-muted-foreground'>
          {[
            unit.propertyType && propertyTypeLabel(unit.propertyType),
            `${unit.rooms} bd`,
            `${unit.bathrooms} ba`,
            `${unit.floorArea} m²`,
            unit.deliveryYear ? `Delivery ${unit.deliveryYear}` : 'Ready',
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>
        {reasons?.length ? (
          <div className='mt-1 text-xs text-emerald-700'>
            {reasons.join(' · ')}
          </div>
        ) : null}
      </div>
    </div>
  );
}
