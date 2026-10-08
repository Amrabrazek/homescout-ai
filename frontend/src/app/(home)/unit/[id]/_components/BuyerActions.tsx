'use client';

import { useEffect, useRef, useState } from 'react';
import { Heart, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/ui';
import { unsaveUnit } from '@/lib/graphql/buyer/actions';
import type { BuyerEventType } from '@/lib/graphql/buyer/types';

function recordEvent(unitId: string, type: BuyerEventType) {
  return fetch('/api/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ unitId, type }),
    keepalive: true,
  });
}

type BuyerActionsProps = {
  unitId: string;
  initialSaved: boolean;
};

/** Records the view, and lets the buyer save or skip the unit. */
export function BuyerActions({ unitId, initialSaved }: BuyerActionsProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [skipped, setSkipped] = useState(false);
  const [pending, setPending] = useState(false);
  const viewed = useRef<string | null>(null);

  useEffect(() => {
    if (viewed.current === unitId) return;
    viewed.current = unitId;
    recordEvent(unitId, 'view').catch(() => undefined);
  }, [unitId]);

  const toggleSave = async () => {
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

  const skip = async () => {
    setPending(true);
    const response = await recordEvent(unitId, 'skip').catch(() => null);
    if (response?.ok) {
      setSkipped(true);
      toast.success("Got it, we'll show you fewer units like this");
    } else {
      toast.error('Could not record that');
    }
    setPending(false);
  };

  return (
    <div className='flex gap-3 mt-3'>
      <Button
        variant='outline'
        className='flex-1'
        onClick={toggleSave}
        disabled={pending}
        aria-pressed={saved}
      >
        <Heart
          size={18}
          className={cn('mr-2', { 'fill-red-500 text-red-500': saved })}
        />
        {saved ? 'Saved' : 'Save'}
      </Button>
      <Button
        variant='outline'
        className='flex-1'
        onClick={skip}
        disabled={pending || skipped}
      >
        <ThumbsDown size={18} className='mr-2' />
        {skipped ? 'Skipped' : 'Not for me'}
      </Button>
    </div>
  );
}
