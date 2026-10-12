import { getServerClient } from '@/lib/apollo/client';
import { asBuyer, getBuyerId } from '@/lib/graphql/buyer/server';
import { SIMILAR_UNITS_QUERY } from '@/lib/graphql/units/queries';
import type {
  GetSimilarUnitsQueryResponse,
  SimilarUnit,
} from '@/lib/graphql/units/types';
import { FOR_YOU } from './queries';
import type { Feed, HomeFeed } from './types';

/** Two rows of four on desktop. */
const FEED_SIZE = 8;

/** The home page "For you" section. Null when the API can't be reached. */
export async function getHomeFeed(): Promise<HomeFeed | null> {
  try {
    const { forYou } = await asBuyer<{ forYou: Feed }>(
      { query: FOR_YOU },
      { section: 'FOR_YOU', limit: FEED_SIZE }
    );
    return {
      coldStart: forYou.coldStart,
      title: forYou.coldStart ? 'Popular right now' : 'For you',
      items: forYou.items,
    };
  } catch (error) {
    console.error('Error loading the For you feed:', error);
    return null;
  }
}

/**
 * Similar units, fetched on the server so the API gets the buyer header and
 * blends in the buyer's match. Empty when the API can't be reached.
 */
export async function getSimilarUnits(
  unitId: string,
  limit = 4
): Promise<SimilarUnit[]> {
  const variables = { unitId, limit };
  try {
    if (getBuyerId()) {
      const data = await asBuyer<GetSimilarUnitsQueryResponse>(
        { query: SIMILAR_UNITS_QUERY },
        variables
      );
      return data.similarUnits;
    }
    const { data } =
      await getServerClient().query<GetSimilarUnitsQueryResponse>({
        query: SIMILAR_UNITS_QUERY,
        variables,
        fetchPolicy: 'no-cache',
      });
    return data.similarUnits;
  } catch (error) {
    console.error('Error loading similar units:', error);
    return [];
  }
}
