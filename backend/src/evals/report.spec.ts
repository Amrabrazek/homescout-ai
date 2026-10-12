import { LlmQueryParser } from '../modules/search/llm-query-parser';
import { SearchLlm } from '../modules/search/search-llm';
import { FeedEvalResult } from './feed.eval';
import { runParseEval } from './parse.eval';
import { renderSearchReport } from './report';
import { RetrievalEvalResult } from './retrieval.eval';

const vocabulary = {
  areas: [
    'New Cairo',
    'Sheikh Zayed',
    'Fifth Settlement',
    'Madinaty',
    'New Administrative Capital',
  ],
  cities: ['Cairo', 'North Coast'],
  regions: ['North Coast'],
};

const retrieval: RetrievalEvalResult = {
  k: 10,
  models: ['local-e5-small'],
  queries: [
    {
      query: 'chalet with a sea view',
      text: 'sea view',
      relevantLabel: 'sea view',
      poolSize: 300,
      baseRate: 0.5,
      precision: { 'local-e5-small': 0.9 },
    },
  ],
  summary: {
    'local-e5-small': {
      meanPrecision: 0.9,
      queryLatencyMs: { p50: 12, p95: 30 },
    },
  },
  meanBaseRate: 0.5,
};

const feed: FeedEvalResult = {
  k: 10,
  saves: 3,
  model: 'local-e5-small',
  personas: [
    {
      persona: 'Summer-home buyer',
      tasteLabel: 'sea view',
      prefsOnly: { hard: 1, taste: 0.5 },
      withSaves: { hard: 1, taste: 0.8 },
      tasteVector: true,
    },
  ],
  twoTaste: {
    name: 'Two tastes',
    tasteVector: true,
    counts: [
      { label: 'A', count: 6 },
      { label: 'B', count: 1 },
    ],
    neither: 3,
  },
};

describe('search eval report', () => {
  it('tells LLM answers from silent fallbacks and renders every section', async () => {
    const llm: SearchLlm = {
      model: 'stub/model',
      extract: jest.fn(async ({ query }) => {
        if (query.includes('owad')) throw new Error('timeout');
        return {
          minRooms: 3,
          maxRooms: null,
          minPrice: null,
          maxPrice: null,
          minFloorArea: null,
          maxFloorArea: null,
          minFloor: null,
          maxFloor: null,
          propertyTypes: [],
          places: ['Sheikh Zayed'],
          text: '',
        };
      }),
    };
    const parse = await runParseEval(vocabulary, {
      parser: new LlmQueryParser(llm, 1_000),
      model: llm.model,
    });

    const family = parse.cases.find((c) => c.query.startsWith('family of 5'));
    expect(family.regex.diff.pass).toBe(false);
    expect(family.llm).toMatchObject({ asked: true, fellBack: false });
    expect(family.llm.diff.pass).toBe(true);
    const owad = parse.cases.find((c) => c.query.includes('owad'));
    expect(owad.llm.fellBack).toBe(true);
    expect(parse.llmLatencyMs.calls).toBeGreaterThan(0);

    const markdown = renderSearchReport({
      generatedAt: new Date('2026-10-12'),
      units: 2591,
      parse,
      retrieval,
      skippedModels: [
        { model: 'openai-text-embedding-3-small', reason: 'no key' },
      ],
      feed,
      similar: {
        k: 4,
        seeds: 20,
        model: 'local-e5-small',
        vectors: true,
        overlap: 0.7,
        baseline: 0.4,
        perTrait: [{ label: 'view', overlap: 0.7, baseline: 0.4 }],
      },
    });
    expect(markdown).toContain('| Query parsing, regex + LLM (stub/model) |');
    expect(markdown).toContain('(fell back to regex)');
    expect(markdown).toContain(
      '| chalet with a sea view | sea view | sea view | 300 | 50% | 90% |'
    );
    expect(markdown).toContain(
      '| Summer-home buyer | sea view | 100% → 100% | 50% → 80% |'
    );
    expect(markdown).toContain(
      'openai-text-embedding-3-small | skipped: no key'
    );
    expect(markdown).toContain('| view | 70% | 40% |');
  });
});
