import { cookies } from 'next/headers';
import { PREVIOUS_VISIT_COOKIE } from '@/lib/buyer/cookie';
import { getServerClient } from '@/lib/apollo/client';
import { asBuyer, getBuyerId } from '@/lib/graphql/buyer/server';
import { SIMILAR_UNITS_QUERY } from '@/lib/graphql/units/queries';
import type {
  GetSimilarUnitsQueryResponse,
  SimilarUnit,
} from '@/lib/graphql/units/types';
import { FOR_YOU } from './queries';
import type { Feed, FeedRail, FeedSection, HomeFeed } from './types';

const RAIL_SIZE = 4;
/** A rail with fewer cards than this after de-duplication is hidden. */
const MIN_RAIL = 2;

const TITLES: Record<FeedSection, string> = {
  FOR_YOU: 'For you',
  IN_BUDGET: 'In your budget',
  IN_AREAS: 'In your areas',
  NEW: 'New since your last visit',
};

/**
 * The home page rails, in order. With full preferences the sections pick
 * from overlapping pools, so a unit shown in an earlier rail is dropped from
 * later ones. Null when the API can't be reached.
 */
export async function getHomeFeed(): Promise<HomeFeed | null> {
  const since = cookies().get(PREVIOUS_VISIT_COOKIE)?.value;
  const sections: FeedSection[] = ['FOR_YOU', 'IN_BUDGET', 'IN_AREAS', 'NEW'];
  try {
    const feeds = await Promise.all(
      sections.map((section, i) =>
        asBuyer<{ forYou: Feed }>(
          { query: FOR_YOU },
          {
            section,
            limit: RAIL_SIZE * 2 * (i + 1),
            since: section === 'NEW' ? since : undefined,
          }
        ).then((data) => data.forYou)
      )
    );

    const shown = new Set<string>();
    const rails: FeedRail[] = [];
    for (const feed of feeds) {
      const items = feed.items
        .filter((item) => !shown.has(item.unit.id))
        .slice(0, RAIL_SIZE);
      if (items.length < MIN_RAIL) continue;
      items.forEach((item) => shown.add(item.unit.id));
      rails.push({
        section: feed.section,
        title:
          feed.coldStart && feed.section === 'FOR_YOU'
            ? 'Popular right now'
            : TITLES[feed.section],
        items,
      });
    }
    return { coldStart: feeds[0].coldStart, rails };
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
