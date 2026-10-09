import { Metadata } from 'next';
import { ConciergeChat } from '@/components/concierge/ConciergeChat';

export const metadata: Metadata = { title: 'Concierge' };

export default function ConciergePage() {
  return (
    <div className='mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col'>
      <div className='border-b px-4 py-3'>
        <h1 className='text-lg font-semibold'>HomeScout concierge</h1>
        <p className='text-sm text-muted-foreground'>
          Describe what you need. Every unit shown comes from our listings.
        </p>
      </div>
      <ConciergeChat className='flex-1' />
    </div>
  );
}
