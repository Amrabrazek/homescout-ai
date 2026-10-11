import { Logger } from '@nestjs/common';
import { PropertyType } from '../../common/enums/unit-attributes';
import { LocationVocabulary, ParsedQuery } from './query-parser';
import { SearchLlm } from './search-llm';

export const MAX_LLM_QUERY_LENGTH = 200;
const TIMEOUT_MS = 4_000;
const CACHE_SIZE = 1_000;
const MAX_ROOMS = 20;
const MAX_PRICE = 10_000_000_000;

/**
 * Second pass after the regex parser. When the regex leaves words over, an LLM
 * reads the whole query and fills the filters the regex missed. Anything that
 * goes wrong (no key, over budget, timeout, invalid output) keeps the regex result.
 */
export class LlmQueryParser {
  private readonly logger = new Logger(LlmQueryParser.name);
  private readonly cache = new Map<string, Promise<ParsedQuery | undefined>>();
  private spent = { day: '', calls: 0 };

  constructor(
    private readonly llm: SearchLlm | null,
    private readonly dailyLimit: number
  ) {}

  async refine(
    query: string,
    regex: ParsedQuery,
    vocabulary: LocationVocabulary
  ): Promise<ParsedQuery> {
    if (!this.llm || !regex.text || query.length > MAX_LLM_QUERY_LENGTH)
      return regex;

    const key = query.toLowerCase().replace(/\s+/g, ' ').trim();
    let pending = this.cache.get(key);
    if (pending) {
      this.cache.delete(key);
    } else {
      if (!this.spend()) return regex;
      pending = this.ask(query, regex, vocabulary);
    }
    this.cache.set(key, pending);
    if (this.cache.size > CACHE_SIZE)
      this.cache.delete(this.cache.keys().next().value);

    const llm = await pending;
    if (llm) return mergeParses(regex, llm);
    if (this.cache.get(key) === pending) this.cache.delete(key);
    return regex;
  }

  private async ask(
    query: string,
    regex: ParsedQuery,
    vocabulary: LocationVocabulary
  ): Promise<ParsedQuery | undefined> {
    try {
      const raw = await this.llm.extract(
        {
          query,
          parsed: regex.filter,
          places: [
            ...new Set([
              ...vocabulary.areas,
              ...vocabulary.cities,
              ...vocabulary.regions,
            ]),
          ],
        },
        AbortSignal.timeout(TIMEOUT_MS)
      );
      const parsed = toParsedQuery(raw, vocabulary);
      if (!parsed) throw new Error('output did not match the filter schema');
      return parsed;
    } catch (error) {
      this.logger.warn(
        `LLM search parse failed, using regex result: ${error.message}`
      );
      return undefined;
    }
  }

  private spend(): boolean {
    const day = new Date().toISOString().slice(0, 10);
    if (this.spent.day !== day) this.spent = { day, calls: 0 };
    if (this.spent.calls >= this.dailyLimit) return false;
    this.spent.calls++;
    return true;
  }
}

/** Validates raw LLM output; places must be names from the vocabulary. */
export function toParsedQuery(
  raw: unknown,
  vocabulary: LocationVocabulary
): ParsedQuery | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const value = raw as Record<string, unknown>;
  if (typeof value.text !== 'string') return undefined;

  const filter: ParsedQuery['filter'] = {};
  const rooms = range(value.minRooms, value.maxRooms, (n) =>
    Number.isInteger(n) && n >= 0 && n <= MAX_ROOMS ? n : undefined
  );
  if (rooms.min != null) filter.minRooms = rooms.min;
  if (rooms.max != null) filter.maxRooms = rooms.max;
  const price = range(value.minPrice, value.maxPrice, (n) =>
    n > 0 && n < MAX_PRICE ? n : undefined
  );
  if (price.min != null) filter.minPrice = price.min;
  if (price.max != null) filter.maxPrice = price.max;

  const types = strings(value.propertyTypes).filter((t): t is PropertyType =>
    (Object.values(PropertyType) as string[]).includes(t)
  );
  if (types.length) filter.propertyTypes = [...new Set(types)];

  for (const place of strings(value.places)) {
    const match = findPlace(place, vocabulary);
    if (!match) continue;
    const list = (filter[match.kind] ??= []);
    if (!list.includes(match.name)) list.push(match.name);
  }

  return { text: value.text.trim().slice(0, MAX_LLM_QUERY_LENGTH), filter };
}

/**
 * The regex result wins for every group it found (rooms, price, type, place),
 * so the LLM only fills gaps. The LLM's text replaces the leftover words.
 */
export function mergeParses(regex: ParsedQuery, llm: ParsedQuery): ParsedQuery {
  const groups: (keyof ParsedQuery['filter'])[][] = [
    ['minRooms', 'maxRooms'],
    ['minPrice', 'maxPrice'],
    ['propertyTypes'],
    ['areas', 'cities', 'regions'],
  ];
  const filter: ParsedQuery['filter'] = {};
  for (const group of groups) {
    const source = group.some((key) => regex.filter[key] != null) ? regex : llm;
    for (const key of group)
      if (source.filter[key] != null)
        (filter as Record<string, unknown>)[key] = source.filter[key];
  }
  return { text: llm.text, filter };
}

function range(
  min: unknown,
  max: unknown,
  check: (n: number) => number | undefined
): { min?: number; max?: number } {
  const lo = typeof min === 'number' ? check(min) : undefined;
  const hi = typeof max === 'number' ? check(max) : undefined;
  if (lo != null && hi != null && lo > hi) return {};
  return { min: lo, max: hi };
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];
}

function findPlace(
  place: string,
  vocabulary: LocationVocabulary
): { kind: 'areas' | 'cities' | 'regions'; name: string } | undefined {
  const wanted = place.trim().toLowerCase();
  for (const kind of ['areas', 'cities', 'regions'] as const) {
    const name = vocabulary[kind].find((n) => n.toLowerCase() === wanted);
    if (name) return { kind, name };
  }
  return undefined;
}
