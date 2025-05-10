import { cache } from 'react';
import { getClient, getServerClient } from '@/lib/apollo/client';
import { GET_UNIT } from './queries';
import type { Unit, GetUnitQueryResponse } from './types';

/**
 * Server-side function to fetch a unit by ID
 * This is cached to prevent duplicate requests during server rendering
 */
export const getUnitById = cache(async (id: string): Promise<Unit | null> => {
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
});
