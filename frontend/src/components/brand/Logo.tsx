import { cn } from '@/lib/utils/ui';

type LogoMarkProps = {
  className?: string;
};

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox='0 0 40 40'
      aria-hidden='true'
      className={cn('h-8 w-8 shrink-0', className)}
    >
      <rect width='40' height='40' rx='11' className='fill-primary' />
      <path
        d='M11 30V19.5L20 12l9 7.5V30'
        fill='none'
        strokeWidth='3.2'
        strokeLinejoin='round'
        className='stroke-primary-foreground'
      />
      <circle cx='20' cy='23.5' r='2.6' className='fill-primary-foreground' />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  markClassName?: string;
};

export function Logo({ className, markClassName }: LogoProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap text-xl font-extrabold tracking-tight',
        className
      )}
    >
      <LogoMark className={markClassName} />
      <span>
        HomeScout<span className='text-primary'>.</span>
      </span>
    </span>
  );
}
