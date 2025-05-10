import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/ui';

interface FloatingRedirectionProps {
  redirectionUrl: string;
}

export default function FloatingRedirection({
  redirectionUrl,
}: FloatingRedirectionProps) {
  return (
    <div className='fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500'>
      <Button
        asChild
        size='lg'
        className={cn(
          'rounded-full h-14 w-14 shadow-lg',
          'bg-primary hover:bg-primary/90',
          'transition-all duration-300 ease-in-out',
          'hover:scale-110 hover:shadow-xl',
          'active:scale-95',
          'group'
        )}
      >
        <Link
          href={redirectionUrl}
          className='flex items-center justify-center'
        >
          <Plus
            size={24}
            className='transition-transform duration-300 group-hover:rotate-90'
          />
        </Link>
      </Button>
    </div>
  );
}
