import type { UnitCard } from '@/lib/concierge/types';
import type { AgentCase, ExpectedSearch } from './cases';

export interface ToolCall {
  name: string;
  input: any;
  output?: any;
  error?: string;
}

export interface TurnTranscript {
  user: string;
  reply: string;
  toolCalls: ToolCall[];
}

export interface CheckResult {
  pass: boolean;
  /** What went wrong, for the report. */
  detail?: string;
}

export const CHECKS = [
  'grounded',
  'constraints',
  'asksWhenVague',
  'actsWhenClear',
  'searches',
  'savesPreferences',
  'onTopic',
] as const;
export type CheckName = (typeof CHECKS)[number];

export const CHECK_LABELS: Record<CheckName, string> = {
  grounded: 'Grounded: every price and project in the reply came from a tool',
  constraints: "Constraints: the search applied the buyer's hard needs",
  asksWhenVague: 'Asks one question before searching when details are missing',
  actsWhenClear: 'Searches right away when the buyer gave enough',
  searches: 'Looks it up instead of estimating',
  savesPreferences: 'Saves stated needs to preferences',
  onTopic: 'Declines off-topic asks without tools or leaks',
};

/**
 * Deterministic checks for one conversation. Written apart from the concierge
 * code on purpose: an eval that reuses the code it checks can't catch its bugs.
 * A check that doesn't apply to the case is left out.
 */
export function runChecks(
  testCase: AgentCase,
  turns: TurnTranscript[],
  projectNames: string[]
): Partial<Record<CheckName, CheckResult>> {
  const last = turns[turns.length - 1];
  const first = turns[0];
  const results: Partial<Record<CheckName, CheckResult>> = {
    grounded: checkGrounded(turns, projectNames),
  };

  if (testCase.search) {
    results.constraints = checkConstraints(last, testCase.search);
    results.savesPreferences = calls(last, 'update_preferences').length
      ? { pass: true }
      : { pass: false, detail: 'never called update_preferences' };
  }
  if (testCase.asksFirst) results.asksWhenVague = checkAsks(first);
  if (testCase.kind === 'persona') {
    results.actsWhenClear = calls(first, 'search_units').length
      ? { pass: true }
      : { pass: false, detail: 'asked instead of searching' };
  }
  if (testCase.mustSearch) {
    results.searches = calls(last, 'search_units').length
      ? { pass: true }
      : { pass: false, detail: 'answered without search_units' };
  }
  if (testCase.forbidden)
    results.onTopic = checkOnTopic(last, testCase.forbidden);
  return results;
}

function calls(turn: TurnTranscript, name: string): ToolCall[] {
  return turn.toolCalls.filter((c) => c.name === name);
}

function checkAsks(turn: TurnTranscript): CheckResult {
  if (calls(turn, 'search_units').length)
    return { pass: false, detail: 'searched before asking' };
  if (!turn.reply.includes('?'))
    return { pass: false, detail: 'no question in the reply' };
  return { pass: true };
}

function checkOnTopic(turn: TurnTranscript, forbidden: RegExp[]): CheckResult {
  const used = turn.toolCalls.map((c) => c.name);
  if (used.length) return { pass: false, detail: `called ${used.join(', ')}` };
  const hit = forbidden.find((pattern) => pattern.test(turn.reply));
  return hit ? { pass: false, detail: `reply matches ${hit}` } : { pass: true };
}

/**
 * The last search of the turn must set every expected filter at least as
 * tightly as asked, and every unit it returned must meet the constraints.
 * Checking the units too catches a filter that is set but resolved wrong.
 */
export function checkConstraints(
  turn: TurnTranscript,
  expected: ExpectedSearch
): CheckResult {
  const searches = calls(turn, 'search_units').filter((c) => !c.error);
  const search = searches[searches.length - 1];
  if (!search) return { pass: false, detail: 'no search_units call' };
  const args = search.input ?? {};
  const problems: string[] = [];

  if (expected.maxPrice != null) {
    if (args.maxPrice == null) problems.push('maxPrice missing');
    else if (args.maxPrice > expected.maxPrice)
      problems.push(`maxPrice ${args.maxPrice} > ${expected.maxPrice}`);
  }
  if (expected.minRooms != null) {
    if (args.minRooms == null) problems.push('minRooms missing');
    else if (args.minRooms < expected.minRooms)
      problems.push(`minRooms ${args.minRooms} < ${expected.minRooms}`);
  }
  if (expected.propertyTypes) {
    const types: string[] = args.propertyTypes ?? [];
    if (!types.length) problems.push('propertyTypes missing');
    const extra = types.filter(
      (t) => !expected.propertyTypes!.includes(t as any)
    );
    if (extra.length) problems.push(`extra propertyTypes ${extra.join(', ')}`);
  }
  if (expected.places) {
    const locations: string[] = args.locations ?? [];
    if (!locations.length) problems.push('locations missing');
  }
  if (expected.amenities) {
    const asked = (args.amenities ?? []).map(lower);
    const missing = expected.amenities.filter(
      (a) =>
        !asked.some((x: string) => lower(a).includes(x) || x.includes(lower(a)))
    );
    if (missing.length)
      problems.push(`amenities missing ${missing.join(', ')}`);
  }

  const units: UnitCard[] = search.output?.units ?? [];
  const bad = units.filter((u) => unitProblem(u, expected));
  if (bad.length)
    problems.push(
      `${bad.length}/${units.length} units break it (${unitProblem(bad[0], expected)})`
    );

  return problems.length
    ? { pass: false, detail: problems.join('; ') }
    : { pass: true };
}

function unitProblem(unit: UnitCard, expected: ExpectedSearch): string | null {
  if (expected.maxPrice != null && unit.price > expected.maxPrice)
    return `price ${unit.price}`;
  if (expected.minRooms != null && unit.rooms < expected.minRooms)
    return `${unit.rooms} rooms`;
  if (
    expected.propertyTypes &&
    !expected.propertyTypes.includes(unit.propertyType as any)
  )
    return `type ${unit.propertyType}`;
  if (expected.places) {
    const places = expected.places.map(lower);
    if (![unit.area, unit.city].some((p) => p && places.includes(lower(p))))
      return `in ${unit.area}`;
  }
  return null;
}

const lower = (text: string) => text.toLowerCase();

const MILLIONS = /(\d+(?:\.\d+)?)\s*(?:M(?![²2a-z])|million|mn\b)/gi;
const THOUSANDS = /(\d+(?:\.\d+)?)\s*(?:K\b|thousand)/gi;
const FULL = /(\d{1,3}(?:,\d{3})+|\d{5,})\s*(?:EGP|LE|pounds)/gi;

export interface PriceMention {
  text: string;
  value: number;
  /** Half the last shown digit: "9.5M" covers 9.45M to 9.55M. */
  tolerance: number;
}

/** Money amounts written in a reply ("9.5M EGP", "750K", "9,500,000 EGP"). */
export function extractPrices(text: string): PriceMention[] {
  const found: PriceMention[] = [];
  const scan = (pattern: RegExp, scale: number) => {
    for (const match of Array.from(text.matchAll(pattern))) {
      const raw = match[1].replace(/,/g, '');
      const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
      found.push({
        text: match[0].trim(),
        value: Number(raw) * scale,
        tolerance: (0.5 * scale) / 10 ** decimals,
      });
    }
  };
  scan(MILLIONS, 1_000_000);
  scan(THOUSANDS, 1_000);
  scan(FULL, 1);
  return found;
}

/**
 * Every price in a reply must be a number the conversation already holds: a
 * unit price from a tool result, a filter or preference value, a number the
 * buyer wrote, or the gap between two tool prices. Every catalog project named
 * must have appeared in a tool result.
 */
export function checkGrounded(
  turns: TurnTranscript[],
  projectNames: string[]
): CheckResult {
  const problems: string[] = [];
  const known: number[] = [];
  const toolText: string[] = [];

  turns.forEach((turn) => {
    for (const mention of extractPrices(turn.user)) known.push(mention.value);
    for (const call of turn.toolCalls) {
      toolText.push(JSON.stringify(call.output ?? ''));
      collectNumbers(call.input, known);
      collectNumbers(call.output, known);
    }
  });
  const unitPrices = turns.flatMap((t) =>
    t.toolCalls.flatMap((c) => unitsOf(c.output).map((u) => u.price))
  );
  for (const a of unitPrices)
    for (const b of unitPrices) if (a > b) known.push(a - b);

  for (const turn of turns) {
    for (const mention of extractPrices(turn.reply)) {
      const grounded = known.some(
        (value) => Math.abs(value - mention.value) <= mention.tolerance
      );
      if (!grounded) problems.push(`price "${mention.text}"`);
    }
  }

  const seen = lower(toolText.join(' '));
  const replies = turns.map((t) => t.reply).join('\n');
  for (const name of projectNames) {
    if (
      new RegExp(`\\b${escape(name)}\\b`, 'i').test(replies) &&
      !seen.includes(lower(name))
    )
      problems.push(`project "${name}"`);
  }

  return problems.length
    ? {
        pass: false,
        detail: `not from a tool: ${Array.from(new Set(problems)).join(', ')}`,
      }
    : { pass: true };
}

function unitsOf(output: any): UnitCard[] {
  if (!output) return [];
  if (Array.isArray(output))
    return output.map((x) => x?.unit ?? x).filter((u) => u?.price != null);
  if (Array.isArray(output.units)) return output.units;
  return output.price != null ? [output] : [];
}

function collectNumbers(value: unknown, into: number[]) {
  if (typeof value === 'number') into.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectNumbers(v, into));
  else if (value && typeof value === 'object')
    Object.values(value).forEach((v) => collectNumbers(v, into));
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
