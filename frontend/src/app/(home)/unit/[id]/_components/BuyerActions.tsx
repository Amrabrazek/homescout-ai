'use client';

import { useEffect, useRef, useState } from 'react';
import { ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { recordEvent } from '@/lib/buyer/events';
import { SaveHeart } from '@/app/(home)/_components/SaveHeart';

type BuyerActionsProps = {
  unitId: string;
  initialSaved: boolean;
};

/** Records the view, and lets the buyer save or skip the unit. */
export function BuyerActions({ unitId, initialSaved }: BuyerActionsProps) {
  const [skipped, setSkipped] = useState(false);
  const [pending, setPending] = useState(false);
  const viewed = useRef<string | null>(null);

  useEffect(() => {
    if (viewed.current === unitId) return;
    viewed.current = unitId;
    recordEvent(unitId, 'view').catch(() => undefined);
  }, [unitId]);

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
    <div className='grid grid-cols-2 gap-2'>
      <SaveHeart unitId={unitId} initialSaved={initialSaved} withLabel />
      <Button
        variant='outline'
        className='h-10 rounded-full font-semibold'
        onClick={skip}
        disabled={pending || skipped}
      >
        <ThumbsDown className='mr-2 h-4 w-4' />
        {skipped ? 'Skipped' : 'Not for me'}
      </Button>
    </div>
  );
}
