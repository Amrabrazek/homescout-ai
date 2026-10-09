'use client';

import { useSimilarUnits } from '@/lib/graphql/units/hooks';
import UnitCard, { UnitCardSkeleton } from '@/app/(home)/_components/UnitCard';

interface SimilarUnitsProps {
  unitId: string;
  savedUnitIds?: string[];
  limit?: number;
}

export function SimilarUnits({
  unitId,
  savedUnitIds = [],
  limit = 4,
}: SimilarUnitsProps) {
  const { data, loading, error } = useSimilarUnits(unitId, limit);
  const similarUnits = data?.similarUnits;

  if (error) {
    console.error('Error loading similar units:', error);
    return null;
  }

  if (!loading && (!similarUnits || similarUnits.length === 0)) {
    return null;
  }

  return (
    <section className='mt-14 border-t pt-10'>
      <h2 className='mb-5 text-xl font-bold tracking-tight'>Similar homes</h2>
      <div className='-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 hide-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4'>
        {loading || !similarUnits
          ? Array.from({ length: limit }).map((_, i) => (
              <div key={i} className='w-[260px] shrink-0 sm:w-auto'>
                <UnitCardSkeleton />
              </div>
            ))
          : similarUnits.map(({ unit, reasons }) => (
              <div
                key={unit.id}
                className='flex w-[260px] shrink-0 snap-start flex-col gap-2 sm:w-auto'
              >
                <UnitCard unit={unit} saved={savedUnitIds.includes(unit.id)} />
                {reasons.length > 0 && (
                  <div className='flex flex-wrap gap-1 px-0.5'>
                    {reasons.map((reason) => (
                      <span
                        key={reason}
                        className='rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground'
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
      </div>
    </section>
  );
}
