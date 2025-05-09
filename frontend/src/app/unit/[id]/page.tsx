import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import UnitDetails, { UnitDetailSkeleton } from './UnitDetailClient';
import { getClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';
import { Suspense } from 'react';
import { cache } from 'react';

const GET_UNIT = gql`
  query GetUnit($id: String!) {
    unit(id: $id) {
      id
      name
      number
      floor
      rooms
      bathrooms
      floorArea
      price
      description
      project {
        id
        name
        developer {
          id
          name
        }
      }
      amenities {
        id
        name
        icon
      }
      images {
        id
        url
        altText
      }
    }
  }
`;

// Create a cached version of the fetcher to prevent duplicate requests
const getUnitData = cache(async (id: string) => {
  const client = getClient();

  try {
    const { data } = await client.query({
      query: GET_UNIT,
      variables: { id },
    });

    return data?.unit;
  } catch (error) {
    console.error('Error fetching unit:', error);
    return null;
  }
});

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const unit = await getUnitData(params.id);

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
  return (
    <Suspense fallback={<UnitDetailSkeleton />}>
      <UnitContent id={params.id} />
    </Suspense>
  );
}

async function UnitContent({ id }: { id: string }) {
  const unit = await getUnitData(id);

  if (!unit) {
    notFound();
  }

  return <UnitDetails unit={unit} />;
}
