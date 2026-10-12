import { UnitService } from '../modules/unit/unit.service';
import { EvalUnit, spread } from './eval-unit';
import { mean } from './metrics';

const SEEDS = 20;
const K = 4;
const PRICE_BAND = 0.3;

/** Traits the rerank's filters and numbers don't cover: only the vector can match them. */
const TRAITS: { label: string; same: (a: EvalUnit, b: EvalUnit) => boolean }[] =
  [
    { label: 'view', same: (a, b) => a.view === b.view },
    { label: 'finishing', same: (a, b) => a.finishing === b.finishing },
    {
      label: 'ready vs off-plan',
      same: (a, b) => (a.deliveryYear == null) === (b.deliveryYear == null),
    },
  ];

export interface SimilarEvalResult {
  k: number;
  seeds: number;
  model: string;
  /** False when the active model has no unit embeddings, so only numbers ranked. */
  vectors: boolean;
  /** Share of seed traits the top K share, averaged over seeds. */
  overlap: number | null;
  /** The same share over the seed's whole first-tier pool: what a random pick scores. */
  baseline: number | null;
  perTrait: {
    label: string;
    overlap: number | null;
    baseline: number | null;
  }[];
}

/**
 * The rerank's filters and number scores are unit-tested; this checks the
 * part they can't: whether neighbours share traits the numbers don't encode
 * (view, finishing, readiness) more than random units from the same pool.
 */
export async function runSimilarEval(
  unitService: UnitService,
  units: Map<string, EvalUnit>,
  model: string,
  vectors: boolean
): Promise<SimilarEvalResult> {
  const all = [...units.values()];
  const seeds = spread(all, SEEDS);
  const shares = TRAITS.map(() => ({
    top: [] as number[],
    pool: [] as number[],
  }));

  for (const seed of seeds) {
    const neighbours = (await unitService.findSimilarUnits(seed.id, K)).map(
      (n) => units.get(n.unit.id)
    );
    const pool = all.filter(
      (u) =>
        u.id !== seed.id &&
        u.propertyType === seed.propertyType &&
        u.region === seed.region &&
        Math.abs(u.price - seed.price) <= PRICE_BAND * seed.price
    );
    if (!neighbours.length || !pool.length) continue;
    TRAITS.forEach((trait, i) => {
      const share = (list: EvalUnit[]) =>
        list.filter((u) => trait.same(seed, u)).length / list.length;
      shares[i].top.push(share(neighbours));
      shares[i].pool.push(share(pool));
    });
  }

  const perTrait = TRAITS.map((trait, i) => ({
    label: trait.label,
    overlap: mean(shares[i].top),
    baseline: mean(shares[i].pool),
  }));
  return {
    k: K,
    seeds: seeds.length,
    model,
    vectors,
    overlap: mean(perTrait.map((t) => t.overlap).filter((v) => v != null)),
    baseline: mean(perTrait.map((t) => t.baseline).filter((v) => v != null)),
    perTrait,
  };
}
