'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] text-center px-4'>
      <h1 className='text-3xl font-bold mb-6'>Something went wrong</h1>
      <p className='text-muted-foreground mb-8'>
        We encountered an error while accessing the units.
      </p>
      <div className='flex flex-col sm:flex-row gap-4'>
        <Button onClick={reset} variant='outline'>
          Try again
        </Button>
        <Button asChild>
          <Link href='/dashboard/units'>Return to Units Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
