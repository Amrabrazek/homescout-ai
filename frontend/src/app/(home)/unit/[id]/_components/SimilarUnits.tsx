import { UnitRail } from '@/app/(home)/_components/ForYouSection';
import type { SimilarUnit } from '@/lib/graphql/units/types';

interface SimilarUnitsProps {
  items: SimilarUnit[];
  savedUnitIds?: string[];
}

export function SimilarUnits({ items, savedUnitIds = [] }: SimilarUnitsProps) {
  if (items.length === 0) return null;

  return (
    <section className='mt-14 border-t pt-10'>
      <h2 className='mb-5 text-xl font-bold tracking-tight'>Similar homes</h2>
      <UnitRail items={items} saved={new Set(savedUnitIds)} />
    </section>
  );
}
