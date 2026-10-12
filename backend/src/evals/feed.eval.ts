import { randomUUID } from 'crypto';
import { BuyerEventType } from '../common/enums/buyer-event-type';
import { BuyerService } from '../modules/buyer/buyer.service';
import { FeedSection, FeedService } from '../modules/feed/feed.service';
import { EvalUnit } from './eval-unit';
import { PERSONAS, TWO_TASTE_BUYER } from './fixtures/personas';
import { meetsPreferences, precisionAtK } from './metrics';

const K = 10;
const SAVES = 3;

export interface FeedScore {
  /** Share of the top K that meets every stated preference. */
  hard: number | null;
  /** Share of the top K that has the persona's unstated taste. */
  taste: number | null;
}

export interface PersonaFeedResult {
  persona: string;
  tasteLabel: string;
  prefsOnly: FeedScore;
  withSaves: FeedScore;
  /** False when the active model has no unit embeddings, so saves made no taste vector. */
  tasteVector: boolean;
}

export interface TwoTasteResult {
  name: string;
  tasteVector: boolean;
  counts: { label: string; count: number }[];
  neither: number;
}

export interface FeedEvalResult {
  k: number;
  saves: number;
  model: string;
  personas: PersonaFeedResult[];
  twoTaste: TwoTasteResult;
}

/**
 * Each persona states preferences, then saves a few units with its taste. The
 * question is whether the saves pull more of that taste into the top K
 * without breaking the stated preferences. Buyers are temporary and deleted.
 */
export async function runFeedEval(
  feed: FeedService,
  buyers: BuyerService,
  units: Map<string, EvalUnit>,
  model: string
): Promise<FeedEvalResult> {
  const all = [...units.values()];
  const personas: PersonaFeedResult[] = [];

  for (const persona of PERSONAS) {
    await withBuyer(buyers, async (buyerId) => {
      await buyers.updatePreferences(buyerId, persona.preferences);
      const score = (ids: string[]): FeedScore => ({
        hard: precisionAtK(
          ids,
          (id) => meetsPreferences(units.get(id), persona.preferences),
          K
        ),
        taste: precisionAtK(
          ids,
          (id) => persona.taste.matches(units.get(id)),
          K
        ),
      });

      const prefsOnly = score(await feedIds(feed, buyerId));
      const picks = spread(
        all.filter(
          (u) =>
            meetsPreferences(u, persona.preferences) && persona.taste.matches(u)
        ),
        SAVES
      );
      const tasteVector = await save(buyers, buyerId, picks);
      personas.push({
        persona: persona.name,
        tasteLabel: persona.taste.label,
        prefsOnly,
        withSaves: score(await feedIds(feed, buyerId)),
        tasteVector,
      });
    });
  }

  let twoTaste: TwoTasteResult;
  await withBuyer(buyers, async (buyerId) => {
    const picks = TWO_TASTE_BUYER.tastes.flatMap((t) =>
      spread(all.filter(t.matches), SAVES)
    );
    const tasteVector = await save(buyers, buyerId, picks);
    const top = (await feedIds(feed, buyerId)).map((id) => units.get(id));
    const counts = TWO_TASTE_BUYER.tastes.map((t) => ({
      label: t.label,
      count: top.filter(t.matches).length,
    }));
    twoTaste = {
      name: TWO_TASTE_BUYER.name,
      tasteVector,
      counts,
      neither: top.filter(
        (u) => !TWO_TASTE_BUYER.tastes.some((t) => t.matches(u))
      ).length,
    };
  });

  return { k: K, saves: SAVES, model, personas, twoTaste };
}

async function withBuyer(
  buyers: BuyerService,
  run: (buyerId: string) => Promise<void>
) {
  const buyerId = randomUUID();
  try {
    await run(buyerId);
  } finally {
    await buyers.reset(buyerId);
  }
}

async function feedIds(feed: FeedService, buyerId: string): Promise<string[]> {
  const { items } = await feed.forYou(buyerId, FeedSection.FOR_YOU, K);
  return items.map((item) => item.unit.id);
}

/** Saves the units and computes the taste vector now instead of via the queue. */
async function save(
  buyers: BuyerService,
  buyerId: string,
  picks: EvalUnit[]
): Promise<boolean> {
  for (const unit of picks) {
    await buyers.recordEvent(buyerId, unit.id, BuyerEventType.SAVE);
  }
  return (await buyers.recomputeTaste(buyerId)) != null;
}

/** n units spread evenly over the list in a stable order, not just the cheapest. */
function spread(candidates: EvalUnit[], n: number): EvalUnit[] {
  const sorted = [...candidates].sort(
    (a, b) =>
      a.price - b.price || a.floorArea - b.floorArea || a.rooms - b.rooms
  );
  if (sorted.length <= n) return sorted;
  return Array.from(
    { length: n },
    (_, i) => sorted[Math.floor(((i + 0.5) * sorted.length) / n)]
  );
}
