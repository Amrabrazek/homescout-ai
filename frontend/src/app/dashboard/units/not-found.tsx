'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] text-center px-4'>
      <h1 className='text-4xl font-bold mb-2'>404</h1>
      <h2 className='text-2xl font-semibold mb-6'>Unit Not Found</h2>
      <p className='text-muted-foreground mb-8'>
        The unit you are looking for doesn&apos;t exist or has been removed.
      </p>
      <Button asChild>
        <Link href='/dashboard/units/new'>Create New Unit</Link>
      </Button>
    </div>
  );
}
