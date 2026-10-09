'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/ui';
import { recordEvent } from '@/lib/buyer/events';
import { unsaveUnit } from '@/lib/graphql/buyer/actions';

type SaveHeartProps = {
  unitId: string;
  initialSaved?: boolean;
  className?: string;
  /** Show "Save" / "Saved" next to the heart, as a pill button. */
  withLabel?: boolean;
};

export function SaveHeart({
  unitId,
  initialSaved = false,
  className,
  withLabel = false,
}: SaveHeartProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  const toggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;
    setPending(true);
    const next = !saved;
    setSaved(next);
    const ok = next
      ? (await recordEvent(unitId, 'save').catch(() => null))?.ok
      : (await unsaveUnit(unitId)).success;
    if (!ok) {
      setSaved(!next);
      toast.error('Could not update your saved units');
    }
    setPending(false);
  };

  return (
    <button
      type='button'
      onClick={toggle}
      aria-pressed={saved}
      aria-label={withLabel ? undefined : saved ? 'Remove from saved' : 'Save'}
      className={cn(
        'place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        withLabel
          ? 'inline-flex h-10 items-center justify-center gap-2 border bg-background px-4 text-sm font-semibold hover:bg-muted'
          : 'grid h-9 w-9 bg-background/90 shadow-sm hover:scale-105',
        className
      )}
    >
      <Heart
        className={cn('h-[18px] w-[18px]', {
          'fill-primary text-primary': saved,
        })}
      />
      {withLabel && (saved ? 'Saved' : 'Save')}
    </button>
  );
}
