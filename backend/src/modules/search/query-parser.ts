import { PropertyType } from '../../common/enums/unit-attributes';
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
    | 'propertyTypes'
    | 'minFloorArea'
    | 'maxFloorArea'
    | 'minFloor'
    | 'maxFloor'
  >;
}

const NUMBER = String.raw`(\d+(?:\.\d+)?)\s*(million|thousand|mil|mn|m|k)?\b`;
const MILLIONS = String.raw`(\d+(?:\.\d+)?)\s*(million|mil|mn|m)\b`;
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
      String.raw`(?:^|\s)(\d+(?:\.\d+)?)\s*(million|mil|mn|m)?\s*(?:-|–|to)\s*${MILLIONS}`,
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

const SIZE = new RegExp(
  String.raw`(?:\b(${UPPER}|${LOWER})\s*)?\b(\d{2,4})\s*(?:sqm|sq\.? ?m|m2|m²|square met(?:er|re)s?|met(?:er|re)s?)(?=\s|$)(?!\s+(?:from|to|away))(?:\s*(or (?:more|bigger|larger|above)|plus|\+|or (?:less|smaller)|max))?`,
  'i'
);

const HIGH_FLOOR = 5;
const FLOORS: [RegExp, (f: ParsedQuery['filter'], n?: number) => void][] = [
  [
    /\b(?:not|no|above)\s+(?:on\s+)?(?:the\s+)?ground(?:[ -]floors?)?\b/i,
    (f) => (f.minFloor = 1),
  ],
  [/\bground[ -]floors?\b/i, (f) => (f.maxFloor = 0)],
  [
    /\b(?:high|higher|upper|top)\s+floors?\b/i,
    (f) => (f.minFloor = HIGH_FLOOR),
  ],
  [
    /\b(?:floor\s+(\d{1,2})|(\d{1,2})(?:st|nd|rd|th)?\s+floor)\b/i,
    (f, n) => (f.minFloor = f.maxFloor = n),
  ],
];

const ROOMS =
  /(?:\b(at least|min(?:imum)?|up to|max(?:imum)?)\s+)?\b(\d{1,2})(?:\s*(?:-|–|to|or)\s*(\d{1,2}))?\s*(\+)?\s*-?\s*([a-z]+)\b(?:\s+(or more|plus|or less|max)\b)?/gi;
const ROOM_ABBREVIATIONS = new Set(['br', 'bd', 'bdr', 'bed', 'beds', 'bhk']);
const ROOM_WORDS = ['bedrooms', 'bedroom', 'rooms', 'room'];

const GENERIC_PLACE_WORDS = new Set([
  'north',
  'south',
  'east',
  'west',
  'city',
  'coast',
  'road',
  'desert',
  'capital',
  'canal',
  'delta',
  'cairo',
]);

const PROPERTY_TYPES: [RegExp, PropertyType][] = [
  [/\bserviced apartments?\b/i, PropertyType.SERVICED_APARTMENT],
  [/\bstudios?\b/i, PropertyType.STUDIO],
  [/\b(?:apartments?|apts?|flats?)\b/i, PropertyType.APARTMENT],
  [/\bduplex(?:es)?\b/i, PropertyType.DUPLEX],
  [/\bpenthouses?\b/i, PropertyType.PENTHOUSE],
  [/\btown ?houses?\b/i, PropertyType.TOWNHOUSE],
  [/\btwin ?houses?\b/i, PropertyType.TWIN_HOUSE],
  [/\bvillas?\b/i, PropertyType.VILLA],
  [/\bchalets?\b/i, PropertyType.CHALET],
];

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
  'i',
  'im',
  'me',
  'my',
  'we',
  'to',
  'is',
  'need',
  'want',
  'looking',
  'buy',
  'some',
  'any',
  'something',
  'anything',
  'please',
]);

/** "no pool", "without a garden": the keyword would rank the opposite first. */
const NEGATED =
  /\b(?:no|not|without|except)\s+(?:a\s+|an\s+|the\s+)?[\p{L}\p{N}]+/giu;

/**
 * Pulls rooms, price, property type and location out of free text so they become hard filters
 * instead of fuzzy hints. Location names come from the data (projects table) and
 * are matched with typo tolerance, e.g. "New Ciaro" → area "New Cairo".
 */
export function parseSearchQuery(
  query: string,
  vocabulary: LocationVocabulary
): ParsedQuery {
  const filter: ParsedQuery['filter'] = {};
  let rest = ` ${query.replace(/(\d),(?=\d{3}\b)/g, '$1')} `;

  rest = rest.replace(
    ROOMS,
    (
      whole,
      prefix?: string,
      from?: string,
      to?: string,
      plus?: string,
      word?: string,
      suffix?: string
    ) => {
      if (!isRoomWord(word.toLowerCase())) return whole;
      const qualifier = `${prefix ?? ''} ${suffix ?? ''}`;
      applyRooms(filter, Number(from), to ? Number(to) : undefined, {
        atLeast: !!plus || /least|min|more|plus/i.test(qualifier),
        atMost: /up to|max|less/i.test(qualifier),
      });
      return ' ';
    }
  );

  rest = rest.replace(
    SIZE,
    (_, qualifier?: string, size?: string, suffix?: string) => {
      const words = `${qualifier ?? ''} ${suffix ?? ''}`;
      if (
        new RegExp(String.raw`\b(?:${UPPER})\b|less|smaller|max`, 'i').test(
          words
        )
      )
        filter.maxFloorArea = Number(size);
      else filter.minFloorArea = Number(size);
      return ' ';
    }
  );

  for (const [regex, apply] of FLOORS) {
    const match = rest.match(regex);
    if (!match) continue;
    const n = match[1] ?? match[2];
    apply(filter, n != null ? Number(n) : undefined);
    rest = rest.replace(match[0], ' ');
  }

  for (const { regex, apply } of PRICE_PATTERNS) {
    const match = rest.match(regex);
    if (!match) continue;
    apply(match, filter);
    rest = rest.replace(match[0], ' ');
  }

  for (const [regex, type] of PROPERTY_TYPES) {
    if (!regex.test(rest)) continue;
    (filter.propertyTypes ??= []).push(type);
    rest = rest.replace(regex, ' ');
  }

  const words = rest.replace(NEGATED, ' ').split(/\s+/).filter(Boolean);
  const remaining = matchLocations(words, vocabulary, filter);

  return {
    text: remaining.filter((w) => !STOP_WORDS.has(w.toLowerCase())).join(' '),
    filter,
  };
}

function applyRooms(
  filter: ParsedQuery['filter'],
  from: number,
  to: number | undefined,
  { atLeast, atMost }: { atLeast: boolean; atMost: boolean }
) {
  if (to != null) {
    filter.minRooms = Math.min(from, to);
    filter.maxRooms = Math.max(from, to);
  } else if (atLeast) {
    filter.minRooms = from;
  } else if (atMost) {
    filter.maxRooms = from;
  } else {
    filter.minRooms = filter.maxRooms = from;
  }
}

function toPrice(value: string, unit?: string): number {
  const n = Number(value);
  switch (unit?.toLowerCase()) {
    case 'k':
    case 'thousand':
      return n * 1_000;
    case 'm':
    case 'mil':
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

      add(filter, best.kind, best.name);
      used.fill(true, start, start + size);
    }
  }

  // A distinctive word of a place name stands for that place: "Zayed" means
  // Sheikh Zayed and New Zayed, "Gouna" means El Gouna.
  words.forEach((word, i) => {
    const w = normalize(word);
    if (used[i] || w.length < 5 || GENERIC_PLACE_WORDS.has(w)) return;
    for (const [kind, names] of kinds) {
      for (const name of names) {
        const match = normalize(name)
          .split(' ')
          .some(
            (part) =>
              !GENERIC_PLACE_WORDS.has(part) &&
              editDistance(w, part) <= allowedTypos(part)
          );
        if (!match) continue;
        add(filter, kind, name);
        used[i] = true;
      }
    }
  });
  return words.filter((_, i) => !used[i]);
}

function add(
  filter: ParsedQuery['filter'],
  kind: 'areas' | 'cities' | 'regions',
  name: string
) {
  const list = (filter[kind] ??= []);
  if (!list.includes(name)) list.push(name);
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
