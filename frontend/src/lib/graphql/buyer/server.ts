import { cookies } from 'next/headers';
import type { DocumentNode } from 'graphql';
import { getServerClient } from '@/lib/apollo/client';
import { BUYER_COOKIE, BUYER_ID_HEADER } from '@/lib/buyer/cookie';
import type { Unit } from '@/lib/graphql/units/types';
import { MY_PROFILE, PREFERENCE_OPTIONS, SAVED_UNITS } from './queries';
import type { BuyerProfile, PreferenceOptions } from './types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getBuyerId(): string | null {
  const value = cookies().get(BUYER_COOKIE)?.value;
  return value && UUID.test(value) ? value : null;
}

/**
 * Runs a GraphQL operation as the current buyer. The browser's cookie stays
 * here; the API only sees the buyer ID header.
 */
export async function asBuyer<T>(
  operation: { query: DocumentNode } | { mutation: DocumentNode },
  variables?: Record<string, unknown>
): Promise<T> {
  const buyerId = getBuyerId();
  if (!buyerId) throw new Error('No buyer cookie');

  const client = getServerClient();
  const context = { headers: { [BUYER_ID_HEADER]: buyerId } };
  if ('query' in operation) {
    const { data } = await client.query<T>({
      query: operation.query,
      variables,
      context,
      fetchPolicy: 'no-cache',
    });
    return data;
  }
  const { data } = await client.mutate<T>({
    mutation: operation.mutation,
    variables,
    context,
  });
  return data as T;
}

export async function getMyProfile(): Promise<BuyerProfile> {
  const data = await asBuyer<{ myProfile: BuyerProfile }>({
    query: MY_PROFILE,
  });
  return data.myProfile;
}

export async function getSavedUnits(): Promise<Unit[]> {
  const data = await asBuyer<{ savedUnits: Unit[] }>({ query: SAVED_UNITS });
  return data.savedUnits;
}

export async function getPreferenceOptions(): Promise<PreferenceOptions> {
  const { data } = await getServerClient().query<{
    projects: { area: string | null }[];
    amenities: { id: string; name: string }[];
  }>({ query: PREFERENCE_OPTIONS });
  const areas = data.projects
    .map((p) => p.area)
    .filter((a, i, all): a is string => !!a && all.indexOf(a) === i);
  return {
    areas: areas.sort(),
    amenities: [...data.amenities].sort((a, b) => a.name.localeCompare(b.name)),
  };
}
