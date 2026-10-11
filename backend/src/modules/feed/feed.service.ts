import { Injectable } from '@nestjs/common';
import { BuyerService } from '../buyer/buyer.service';
import { UnitFilterInput } from '../unit/dto/unit-filter.input';
import { FeedCandidate, UnitService } from '../unit/unit.service';
import { Unit } from '../../common/entities/unit.entity';
import {
  BuyerSignals,
  MATCH_CONFIG,
  hasStatedPreferences,
  preferenceTiers,
  rankMatches,
  scoreMatch,
  toMatchPercent,
  varied,
} from './match-score';

export enum FeedSection {
  FOR_YOU = 'FOR_YOU',
  IN_BUDGET = 'IN_BUDGET',
  IN_AREAS = 'IN_AREAS',
  NEW = 'NEW',
}

export interface FeedItem {
  unit: Unit;
  /** 0 to 100; null in a cold-start feed, where there is nothing to match. */
  matchScore: number | null;
  reasons: string[];
}

export interface Feed {
  section: FeedSection;
  coldStart: boolean;
  items: FeedItem[];
}

export interface SimilarItem extends FeedItem {
  score: number;
}

const CANDIDATES = 60;

@Injectable()
export class FeedService {
  constructor(
    private readonly buyers: BuyerService,
    private readonly units: UnitService
  ) {}

  async forYou(
    buyerId: string,
    section: FeedSection,
    limit: number,
    since?: Date
  ): Promise<Feed> {
    const { signals, taste } = await this.signals(buyerId);
    const coldStart = !hasStatedPreferences(signals.profile) && !taste;
    const feed = (items: FeedItem[]): Feed => ({ section, coldStart, items });

    if (section === FeedSection.FOR_YOU && coldStart) {
      return feed(await this.popular(limit));
    }

    const pools = this.pools(signals, section);
    if (!pools || (section === FeedSection.NEW && !since)) return feed([]);
    const createdAfter = section === FeedSection.NEW ? since : undefined;
    const excludeIds = await this.buyers.decidedUnitIds(buyerId);

    let rows: FeedCandidate[] = [];
    for (const filter of pools) {
      rows = await this.units.feedCandidates(filter, taste, CANDIDATES, {
        createdAfter,
        excludeIds,
      });
      if (rows.length >= limit) break;
    }
    const units = await this.units.findManyByIds(rows.map((r) => r.id));
    const similarity = new Map(rows.map((r) => [r.id, r.similarity]));
    const ranked = rankMatches(
      signals,
      units.map((unit) => ({
        unit,
        tasteSimilarity: similarity.get(unit.id) ?? null,
      })),
      limit,
      this.units.vectorFloor
    );
    return feed(
      ranked.map((m) => ({
        unit: m.unit,
        matchScore: coldStart ? null : toMatchPercent(m.score),
        reasons: m.reasons,
      }))
    );
  }

  /**
   * The unit's own neighbours, re-ranked with the buyer's match when we know
   * the buyer. Anonymous callers get the plain neighbours.
   */
  async similarUnits(
    buyerId: string | null,
    unitId: string,
    limit: number
  ): Promise<SimilarItem[]> {
    const neighbours = await this.units.findSimilarUnits(unitId, limit * 2);
    const plain = (n: (typeof neighbours)[number]): SimilarItem => ({
      ...n,
      matchScore: null,
    });
    if (!buyerId) return neighbours.slice(0, limit).map(plain);

    const { signals, taste } = await this.signals(buyerId);
    if (!hasStatedPreferences(signals.profile) && !taste) {
      return neighbours.slice(0, limit).map(plain);
    }

    const tasteSimilarity = taste
      ? await this.units.similarityTo(
          neighbours.map((n) => n.unit.id),
          taste
        )
      : new Map<string, number>();
    const weight = MATCH_CONFIG.similarMatchWeight;
    return neighbours
      .map((n) => {
        const match = scoreMatch(
          signals,
          {
            unit: n.unit,
            tasteSimilarity: tasteSimilarity.get(n.unit.id) ?? null,
          },
          this.units.vectorFloor
        );
        const [extra] = match.personalReasons;
        return {
          unit: n.unit,
          score: (1 - weight) * n.score + weight * match.score,
          matchScore: toMatchPercent(match.score),
          reasons: [...n.reasons.slice(0, 2), ...(extra ? [extra] : [])],
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async signals(buyerId: string) {
    const [profile, taste, activity] = await Promise.all([
      this.buyers.getProfile(buyerId),
      this.buyers.tasteVector(buyerId),
      this.buyers.activity(buyerId),
    ]);
    const signals: BuyerSignals = {
      profile,
      saves: activity.saves,
    };
    return { signals, taste };
  }

  /**
   * Candidate filters for a section, strict to loose: the section's own rule
   * (never loosened) on top of each preference tier. Null when the buyer gave
   * the section nothing to filter on.
   */
  private pools(
    { profile }: BuyerSignals,
    section: FeedSection
  ): UnitFilterInput[] | null {
    let rule: UnitFilterInput = {};
    if (section === FeedSection.IN_BUDGET) {
      if (profile.budgetMin == null && profile.budgetMax == null) return null;
      rule = {
        ...(profile.budgetMin != null && { minPrice: profile.budgetMin }),
        ...(profile.budgetMax != null && { maxPrice: profile.budgetMax }),
      };
    }
    if (section === FeedSection.IN_AREAS) {
      if (!profile.areas.length) return null;
      rule = { areas: profile.areas };
    }
    return preferenceTiers(profile).map((tier) => ({ ...tier, ...rule }));
  }

  private async popular(limit: number): Promise<FeedItem[]> {
    const rows = await this.units.feedCandidates({}, null, CANDIDATES);
    const popularity = new Map(rows.map((r) => [r.id, r.popularity]));
    const units = await this.units.findManyByIds(rows.map((r) => r.id));
    return varied(units, limit).map((unit) => ({
      unit,
      matchScore: null,
      reasons: popularity.get(unit.id) ? ['Popular with buyers'] : [],
    }));
  }
}
