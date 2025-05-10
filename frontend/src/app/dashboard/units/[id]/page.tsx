import { notFound } from 'next/navigation';
import { UnitForm } from './_components/UnitForm';
import { getUnitById } from '@/lib/graphql/units/server.loaders';
import { Unit } from '@/lib/graphql/units/types';

export default async function UnitPage({ params }: { params: { id: string } }) {
  // If id is "new", we're creating a new unit
  const isNewUnit = params.id === 'new';

  // Only fetch unit data if we're editing an existing unit
  const unitData: Unit | null = isNewUnit ? null : await getUnitById(params.id);

  // If we're trying to edit a unit that doesn't exist, show 404
  if (!isNewUnit && !unitData) {
    return notFound();
  }

  // Transform the unit data for the form if we're editing

  return (
    <div className='w-full'>
      <UnitForm unitData={unitData} />
    </div>
  );
}
