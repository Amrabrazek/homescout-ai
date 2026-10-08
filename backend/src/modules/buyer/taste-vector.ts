import { BuyerEventType } from '../../common/enums/buyer-event-type';

export const EVENT_WEIGHTS: Record<BuyerEventType, number> = {
  [BuyerEventType.SAVE]: 1.0,
  [BuyerEventType.VIEW]: 0.3,
  [BuyerEventType.SKIP]: -0.5,
};

export const TASTE_HALF_LIFE_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface TasteEvent {
  unitId: string;
  type: BuyerEventType;
  createdAt: Date;
  embedding: number[];
}

/**
 * Time-decayed weighted mean of the embeddings of units the buyer interacted
 * with. Each (unit, event type) counts once, at its latest time, so reloading
 * a unit page doesn't outweigh a save. Returns null when nothing positive is
 * left: the mean of skips alone points away from listings, not towards a taste.
 */
export function computeTasteVector(
  events: TasteEvent[],
  now: Date = new Date()
): number[] | null {
  const latest = new Map<string, TasteEvent>();
  for (const event of events) {
    const key = `${event.unitId}:${event.type}`;
    const seen = latest.get(key);
    if (!seen || seen.createdAt < event.createdAt) latest.set(key, event);
  }

  let sum: number[] | null = null;
  let totalWeight = 0;
  let positiveWeight = 0;
  for (const event of latest.values()) {
    const ageDays =
      Math.max(0, now.getTime() - event.createdAt.getTime()) / DAY_MS;
    const weight =
      EVENT_WEIGHTS[event.type] * 0.5 ** (ageDays / TASTE_HALF_LIFE_DAYS);
    sum ??= new Array(event.embedding.length).fill(0);
    if (event.embedding.length !== sum.length) {
      throw new Error('Embeddings of different sizes cannot be combined');
    }
    for (let i = 0; i < sum.length; i++) sum[i] += weight * event.embedding[i];
    totalWeight += Math.abs(weight);
    if (weight > 0) positiveWeight += weight;
  }

  if (!sum || positiveWeight === 0) return null;
  return sum.map((value) => value / totalWeight);
}
