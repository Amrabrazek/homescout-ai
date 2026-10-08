'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Maximize2, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import pathsConfig from '@/config/paths.config';
import { ConciergeChat } from './ConciergeChat';

export function FloatingConcierge() {
  const [open, setOpen] = useState(false);
  if (usePathname() === pathsConfig.home.concierge) return null;

  return (
    <>
      {open && (
        <div className='fixed bottom-28 right-4 z-50 flex h-[min(600px,calc(100vh-9rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl sm:right-8'>
          <div className='flex items-center justify-between border-b px-4 py-2'>
            <span className='font-medium'>HomeScout concierge</span>
            <div className='flex'>
              <Button variant='ghost' size='icon' asChild>
                <Link
                  href={pathsConfig.home.concierge}
                  onClick={() => setOpen(false)}
                  aria-label='Open full page'
                  title='Open full page'
                >
                  <Maximize2 className='h-4 w-4' />
                </Link>
              </Button>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setOpen(false)}
                aria-label='Close'
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          </div>
          <ConciergeChat className='flex-1' />
        </div>
      )}
      <Button
        size='lg'
        onClick={() => setOpen((o) => !o)}
        className='fixed bottom-8 right-28 z-50 h-14 w-14 rounded-full shadow-lg'
        aria-label={open ? 'Close concierge' : 'Ask the concierge'}
        title='Ask the concierge'
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </Button>
    </>
  );
}
