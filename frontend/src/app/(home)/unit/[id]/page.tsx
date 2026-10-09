import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import UnitDetails, { UnitDetailSkeleton } from './_components/UnitDetail';
import { Suspense } from 'react';
import { getUnitById } from '@/lib/graphql/units/server.loaders';
import { getMyProfile } from '@/lib/graphql/buyer/server';

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const unit = await getUnitById(params.id);

  if (!unit) {
    return {
      title: 'Unit Not Found',
    };
  }

  return {
    title: `${unit.name} | ${unit.project.name}`,
    description:
      unit.description ||
      `${unit.rooms} bedroom unit with ${unit.bathrooms} bathrooms, ${unit.floorArea} sqm in ${unit.project.name}`,
    openGraph: {
      images: unit.images && unit.images.length > 0 ? [unit.images[0].url] : [],
    },
  };
}

export default async function UnitPage({ params }: Props) {
  const unit = await getUnitById(params.id);

  if (!unit) {
    notFound();
  }

  const profile = await getMyProfile().catch(() => null);

  return (
    <Suspense fallback={<UnitDetailSkeleton />}>
      <UnitDetails unit={unit} profile={profile} />
    </Suspense>
  );
}
