import { UnitFilterInput } from '../unit/dto/unit-filter.input';

export interface LocationVocabulary {
  areas: string[];
  cities: string[];
  regions: string[];
}

export interface ParsedQuery {
  /** What is left for keyword + vector search after structured hints are removed. */
  text: string;
  filter: Pick<
    UnitFilterInput,
    | 'minRooms'
    | 'maxRooms'
    | 'minPrice'
    | 'maxPrice'
    | 'areas'
    | 'cities'
    | 'regions'
  >;
}

const NUMBER = String.raw`(\d+(?:\.\d+)?)\s*(m|mn|million|k|thousand)?`;
const UPPER = String.raw`under|below|less than|max(?:imum)?|up to|upto|within|budget(?: of)?|<`;
const LOWER = String.raw`over|above|more than|min(?:imum)?|at least|starting(?: from)?|>`;

const PRICE_PATTERNS: {
  regex: RegExp;
  apply: (m: RegExpMatchArray, f: ParsedQuery['filter']) => void;
}[] = [
  {
    regex: new RegExp(
      String.raw`\b(?:between|from)\s+${NUMBER}\s+(?:and|to|-)\s+${NUMBER}`,
      'i'
    ),
    apply: (m, f) => {
      f.minPrice = toPrice(m[1], m[2] ?? m[4]);
      f.maxPrice = toPrice(m[3], m[4]);
    },
  },
  {
    regex: new RegExp(
      String.raw`(?:^|\s)(?:${UPPER})\s*(?:egp\s*)?${NUMBER}(?:\s*egp)?\b`,
      'i'
    ),
    apply: (m, f) => (f.maxPrice = toPrice(m[1], m[2])),
  },
  {
    regex: new RegExp(
      String.raw`(?:^|\s)(?:${LOWER})\s*(?:egp\s*)?${NUMBER}(?:\s*egp)?\b`,
      'i'
    ),
    apply: (m, f) => (f.minPrice = toPrice(m[1], m[2])),
  },
];

const ROOMS = /\b(\d{1,2})\s*-?\s*([a-z]+)\b/gi;
const ROOM_ABBREVIATIONS = new Set(['br', 'bd', 'bdr', 'bed', 'beds', 'bhk']);
const ROOM_WORDS = ['bedrooms', 'bedroom', 'rooms', 'room'];

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'in',
  'at',
  'on',
  'with',
  'for',
  'and',
  'or',
  'of',
  'near',
  'egp',
  'price',
  'priced',
]);

/**
 * Pulls rooms, price and location out of free text so they become hard filters
 * instead of fuzzy hints. Location names come from the data (projects table) and
 * are matched with typo tolerance, e.g. "New Ciaro" → area "New Cairo".
 */
export function parseSearchQuery(
  query: string,
  vocabulary: LocationVocabulary
): ParsedQuery {
  const filter: ParsedQuery['filter'] = {};
  let rest = ` ${query.replace(/(\d),(?=\d{3}\b)/g, '$1')} `;

  for (const { regex, apply } of PRICE_PATTERNS) {
    const match = rest.match(regex);
    if (!match) continue;
    apply(match, filter);
    rest = rest.replace(match[0], ' ');
  }

  rest = rest.replace(ROOMS, (whole, count: string, word: string) => {
    if (!isRoomWord(word.toLowerCase())) return whole;
    filter.minRooms = filter.maxRooms = Number(count);
    return ' ';
  });

  const words = rest.split(/\s+/).filter(Boolean);
  const remaining = matchLocations(words, vocabulary, filter);

  return {
    text: remaining.filter((w) => !STOP_WORDS.has(w.toLowerCase())).join(' '),
    filter,
  };
}

function toPrice(value: string, unit?: string): number {
  const n = Number(value);
  switch (unit?.toLowerCase()) {
    case 'k':
    case 'thousand':
      return n * 1_000;
    case 'm':
    case 'mn':
    case 'million':
      return n * 1_000_000;
    default:
      // Prices here are in the millions of EGP, so a bare "under 8" means 8M.
      return n < 1_000 ? n * 1_000_000 : n;
  }
}

function isRoomWord(word: string): boolean {
  if (ROOM_ABBREVIATIONS.has(word)) return true;
  return ROOM_WORDS.some(
    (target) => editDistance(word, target) <= (target.length >= 7 ? 2 : 1)
  );
}

function matchLocations(
  words: string[],
  vocabulary: LocationVocabulary,
  filter: ParsedQuery['filter']
): string[] {
  const kinds = [
    ['areas', vocabulary.areas],
    ['cities', vocabulary.cities],
    ['regions', vocabulary.regions],
  ] as const;
  const used = new Array(words.length).fill(false);

  for (let size = 3; size >= 1; size--) {
    for (let start = 0; start + size <= words.length; start++) {
      if (used.slice(start, start + size).some(Boolean)) continue;
      const phrase = normalize(words.slice(start, start + size).join(' '));
      if (phrase.length < 4) continue;

      let best:
        | { kind: (typeof kinds)[number][0]; name: string; distance: number }
        | undefined;
      for (const [kind, names] of kinds) {
        for (const name of names) {
          const distance = editDistance(phrase, normalize(name));
          if (
            distance <= allowedTypos(name) &&
            (!best || distance < best.distance)
          )
            best = { kind, name, distance };
        }
      }
      if (!best) continue;

      const list = (filter[best.kind] ??= []);
      if (!list.includes(best.name)) list.push(best.name);
      used.fill(true, start, start + size);
    }
  }
  return words.filter((_, i) => !used[i]);
}

function allowedTypos(name: string): number {
  if (name.length <= 4) return 0;
  return name.length <= 8 ? 1 : 2;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .trim();
}

/** Optimal string alignment distance: Levenshtein plus adjacent transpositions. */
export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) =>
      i === 0 ? j : j === 0 ? i : 0
    )
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}
