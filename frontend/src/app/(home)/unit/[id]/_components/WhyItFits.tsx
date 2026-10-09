import Link from 'next/link';
import { Check, Minus, SlidersHorizontal, Sparkles } from 'lucide-react';
import pathsConfig from '@config/paths.config';
import { cn } from '@/lib/utils/ui';
import { fitChecks } from '@/lib/buyer/fit';
import type { BuyerProfile } from '@/lib/graphql/buyer/types';
import type { Unit } from '@/lib/graphql/units/types';

type WhyItFitsProps = {
  profile: BuyerProfile | null;
  unit: Unit;
};

export function WhyItFits({ profile, unit }: WhyItFitsProps) {
  const checks = profile ? fitChecks(profile, unit) : [];
  const met = checks.filter((c) => c.met).length;

  return (
    <section className='rounded-2xl border bg-accent/50 p-5'>
      <div className='flex items-center justify-between gap-3'>
        <h2 className='flex items-center gap-2 text-base font-bold'>
          <Sparkles className='h-4 w-4 text-primary' />
          Why it fits you
        </h2>
        {checks.length > 0 && (
          <span className='text-sm font-semibold text-accent-foreground tabular-nums'>
            {met} of {checks.length} match
          </span>
        )}
      </div>

      {checks.length > 0 ? (
        <ul className='mt-3 space-y-2'>
          {checks.map((check) => (
            <li key={check.label} className='flex items-start gap-2.5 text-sm'>
              <span
                className={cn(
                  'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full',
                  check.met
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {check.met ? (
                  <Check className='h-3 w-3' strokeWidth={3} />
                ) : (
                  <Minus className='h-3 w-3' strokeWidth={3} />
                )}
              </span>
              <span className={cn(!check.met && 'text-muted-foreground')}>
                {check.label}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className='mt-2 text-sm text-muted-foreground'>
          Tell us your budget, areas and must-haves, and we&apos;ll show how
          each home stacks up.
        </p>
      )}

      <Link
        href={pathsConfig.home.preferences}
        className='mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline'
      >
        <SlidersHorizontal className='h-3.5 w-3.5' />
        {checks.length > 0 ? 'Edit preferences' : 'Set your preferences'}
      </Link>
    </section>
  );
}
