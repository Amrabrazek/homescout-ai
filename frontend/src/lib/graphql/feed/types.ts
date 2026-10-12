import type { Unit } from '../units/types';

export const FEED_SECTIONS = [
  'FOR_YOU',
  'IN_BUDGET',
  'IN_AREAS',
  'NEW',
] as const;

export type FeedSection = (typeof FEED_SECTIONS)[number];

export interface MatchedUnit {
  unit: Unit;
  /** 0 to 100; null when there is nothing to match yet. */
  matchScore: number | null;
  reasons: string[];
}

export interface Feed {
  section: FeedSection;
  coldStart: boolean;
  items: MatchedUnit[];
}

export interface FeedRail {
  section: FeedSection;
  title: string;
  items: MatchedUnit[];
}

export interface HomeFeed {
  coldStart: boolean;
  rails: FeedRail[];
}
