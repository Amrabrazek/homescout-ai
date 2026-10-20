import type { InternalApi } from './api';
import type { BuyerContext, BuyerFact, ContextUnit } from './types';

export const ABOUT_BUYER_HEADING = '## About this buyer';

/**
 * The "About this buyer" system block, rebuilt every turn. It goes after the
 * cached static prompt, so buyer data never breaks the prompt cache. Null when
 * the API can't be reached: the chat still works, the model just starts blind.
 */
export async function loadAboutBuyer(api: InternalApi): Promise<string | null> {
  try {
    return aboutBuyer(await api<BuyerContext>('GET', '/context'));
  } catch (error) {
    console.warn('Buyer context unavailable', error);
    return null;
  }
}

export function aboutBuyer({
  preferences: p,
  saved,
  viewed,
  skipped,
  facts,
}: BuyerContext): string {
  const prefs = [
    budget(p.budgetMin, p.budgetMax),
    p.areas.length ? `areas: ${p.areas.join(', ')}` : null,
    p.propertyTypes.length
      ? `types: ${p.propertyTypes.map(label).join(', ')}`
      : null,
    p.minRooms != null ? `at least ${p.minRooms} bedrooms` : null,
    p.minSize != null ? `at least ${p.minSize} m²` : null,
    p.amenities.length ? `amenities: ${p.amenities.join(', ')}` : null,
  ].filter(Boolean);

  return [
    ABOUT_BUYER_HEADING,
    'Loaded from their account when this message arrived. Treat saved preferences as already given. Anything the buyer says or a tool returns in this conversation is newer and wins.',
    `Saved preferences: ${prefs.length ? prefs.join('; ') : 'none yet'}.`,
    units('Saved units', saved),
    units('Recently viewed', viewed),
    units('Not interested (skipped, do not suggest again)', skipped),
    remembered(facts),
  ]
    .filter(Boolean)
    .join('\n');
}

function units(title: string, list: ContextUnit[]): string | null {
  if (!list.length) return null;
  const lines = list.map((u) =>
    [
      `- ${u.name}`,
      u.project,
      u.area,
      `${millions(u.price)} EGP`,
      `id ${u.id}`,
    ]
      .filter(Boolean)
      .join(', ')
  );
  return [`${title}:`, ...lines].join('\n');
}

function remembered(facts: BuyerFact[]): string | null {
  if (!facts.length) return null;
  return [
    'Remembered facts (what the buyer told you in earlier chats):',
    ...facts.map((f) => `- ${f.text} (fact id ${f.id})`),
  ].join('\n');
}

function budget(min: number | null, max: number | null): string | null {
  if (min != null && max != null)
    return `budget ${millions(min)} to ${millions(max)} EGP`;
  if (max != null) return `budget up to ${millions(max)} EGP`;
  if (min != null) return `budget from ${millions(min)} EGP`;
  return null;
}

function millions(price: number): string {
  return `${Number((price / 1_000_000).toFixed(2))}M`;
}

const label = (type: string) => type.replace(/_/g, ' ');
