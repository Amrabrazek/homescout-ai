import { unstable_cache } from 'next/cache';
import { getServerClient } from '@/lib/apollo/client';
import { GET_UNIT } from './queries';
import type { Unit, GetUnitQueryResponse } from './types';

export const UNITS_CACHE_TAG = 'units';

export const getUnitById = unstable_cache(
  async (id: string): Promise<Unit | null> => {
    const client = getServerClient();

    try {
      const { data } = await client.query<GetUnitQueryResponse>({
        query: GET_UNIT,
        variables: { id },
      });

      return data?.unit || null;
    } catch (error) {
      console.error('Error fetching unit:', error);
      return null;
    }
  },
  ['unit-by-id'],
  { revalidate: 60, tags: [UNITS_CACHE_TAG] }
);
