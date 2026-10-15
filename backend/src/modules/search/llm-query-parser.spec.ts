import { LlmQueryParser, mergeParses, toParsedQuery } from './llm-query-parser';
import { parseSearchQuery } from './query-parser';
import { ParseCache } from './parse-cache';
import { SEARCH_PROMPT_VERSION, SearchLlm } from './search-llm';

const vocabulary = {
  areas: ['New Cairo', 'Sheikh Zayed'],
  cities: ['Cairo', 'Giza'],
  regions: ['East Cairo'],
};

const empty = {
  minRooms: null,
  maxRooms: null,
  minPrice: null,
  maxPrice: null,
  minFloorArea: null,
  maxFloorArea: null,
  minFloor: null,
  maxFloor: null,
  propertyTypes: [],
  places: [],
  text: '',
};

function fakeLlm(output: unknown | (() => unknown)): SearchLlm & {
  extract: jest.Mock;
} {
  return {
    model: 'test/model',
    extract: jest.fn(async () =>
      typeof output === 'function' ? output() : output
    ),
  };
}

function parse(parser: LlmQueryParser, query: string) {
  return parser.refine(query, parseSearchQuery(query, vocabulary), vocabulary);
}

describe('LlmQueryParser', () => {
  it('parses an Arabic query the regex cannot read', async () => {
    const llm = fakeLlm({
      ...empty,
      minRooms: 3,
      maxRooms: 3,
      propertyTypes: ['apartment'],
      places: ['New Cairo'],
      text: 'garden',
    });
    const parser = new LlmQueryParser(llm, 10);

    await expect(parse(parser, 'شقة ٣ غرف في التجمع بجنينة')).resolves.toEqual({
      text: 'garden',
      filter: {
        minRooms: 3,
        maxRooms: 3,
        propertyTypes: ['apartment'],
        areas: ['New Cairo'],
      },
    });
    expect(llm.extract.mock.calls[0][0]).toMatchObject({
      leftover: 'شقة ٣ غرف في التجمع بجنينة',
      found: [],
      places: ['New Cairo', 'Sheikh Zayed', 'Cairo', 'Giza', 'East Cairo'],
    });
  });

  it('keeps what the regex found and fills the gaps', async () => {
    const llm = fakeLlm({
      ...empty,
      minRooms: 3,
      maxPrice: 1,
      places: ['Sheikh Zayed'],
    });
    const parser = new LlmQueryParser(llm, 10);

    await expect(
      parse(parser, 'family of 5 in new cairo under 8M')
    ).resolves.toEqual({
      text: '',
      filter: { minRooms: 3, maxPrice: 8_000_000, areas: ['New Cairo'] },
    });
    expect(llm.extract.mock.calls[0][0]).toMatchObject({
      leftover: 'family 5',
      found: ['price', 'place'],
    });
  });

  it('skips the LLM when the regex parsed everything', async () => {
    const llm = fakeLlm(empty);
    const parser = new LlmQueryParser(llm, 10);

    await parse(parser, 'New Cairo 2-3 rooms under 8M');
    expect(llm.extract).not.toHaveBeenCalled();
  });

  it('reuses a parse for another query with the same leftover and found groups', async () => {
    const llm = fakeLlm({ ...empty, places: ['New Cairo'], text: '' });
    const parser = new LlmQueryParser(llm, 10);

    await parse(parser, 'villa near AUC under 10M');
    await expect(
      parse(parser, 'apartment near auc under 12M')
    ).resolves.toEqual({
      text: '',
      filter: {
        maxPrice: 12_000_000,
        propertyTypes: ['apartment'],
        areas: ['New Cairo'],
      },
    });
    expect(llm.extract).toHaveBeenCalledTimes(1);

    await parse(parser, 'villa near AUC');
    expect(llm.extract).toHaveBeenCalledTimes(2);
  });

  it('skips the LLM when only punctuation is left over', async () => {
    const llm = fakeLlm(empty);
    await parse(new LlmQueryParser(llm, 10), 'villa, New Cairo, under 8M');
    expect(llm.extract).not.toHaveBeenCalled();
  });

  it('caches by normalized leftover', async () => {
    const llm = fakeLlm({ ...empty, text: 'quiet' });
    const parser = new LlmQueryParser(llm, 10);

    await parse(parser, 'Quiet  street');
    await parse(parser, 'quiet street ');
    expect(llm.extract).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['the LLM throws', () => Promise.reject(new Error('timeout'))],
    ['the output is not an object', () => 'three rooms'],
    ['the output has no text', () => ({ ...empty, text: undefined })],
  ])('falls back to the regex result when %s', async (_, output) => {
    const llm = fakeLlm(output);
    const parser = new LlmQueryParser(llm, 10);
    const query = 'quiet 2 bed';

    await expect(parse(parser, query)).resolves.toEqual(
      parseSearchQuery(query, vocabulary)
    );
    await parse(parser, query);
    expect(llm.extract).toHaveBeenCalledTimes(2);
  });

  it('uses regex only without an LLM, for long queries and over budget', async () => {
    await expect(parse(new LlmQueryParser(null, 10), 'quiet')).resolves.toEqual(
      { text: 'quiet', filter: {} }
    );

    const llm = fakeLlm({ ...empty, text: 'x' });
    const parser = new LlmQueryParser(llm, 1);
    await parse(parser, `quiet ${'a'.repeat(200)}`);
    await parse(parser, 'quiet');
    await expect(parse(parser, 'calm')).resolves.toEqual({
      text: 'calm',
      filter: {},
    });
    expect(llm.extract).toHaveBeenCalledTimes(1);
  });
});

describe('LlmQueryParser with a persistent store', () => {
  function fakeStore(rows: Record<string, unknown> = {}) {
    return {
      rows,
      get: jest.fn(async ({ found, leftover }) => rows[`${found}|${leftover}`]),
      set: jest.fn(async ({ found, leftover }, output) => {
        rows[`${found}|${leftover}`] = output;
      }),
    } satisfies ParseCache & { rows: Record<string, unknown> };
  }

  it('uses a stored parse without calling the LLM', async () => {
    const llm = fakeLlm({ ...empty, text: 'llm' });
    const store = fakeStore({
      '|quiet street': {
        ...empty,
        places: ['New Cairo', 'Atlantis'],
        text: 'quiet',
      },
    });

    await expect(
      parse(new LlmQueryParser(llm, 10, store), 'Quiet street')
    ).resolves.toEqual({ text: 'quiet', filter: { areas: ['New Cairo'] } });
    expect(llm.extract).not.toHaveBeenCalled();
    expect(store.get).toHaveBeenCalledWith({
      leftover: 'quiet street',
      found: '',
      model: 'test/model',
      promptVersion: SEARCH_PROMPT_VERSION,
    });
  });

  it('stores valid LLM output so a fresh parser reuses it', async () => {
    const llm = fakeLlm({ ...empty, text: 'quiet' });
    const store = fakeStore();

    await parse(new LlmQueryParser(llm, 10, store), 'quiet street');
    await parse(new LlmQueryParser(llm, 10, store), 'quiet street');
    expect(llm.extract).toHaveBeenCalledTimes(1);
    expect(store.rows['|quiet street']).toEqual({ ...empty, text: 'quiet' });
  });

  it('does not store invalid output', async () => {
    const store = fakeStore();
    await parse(new LlmQueryParser(fakeLlm('nope'), 10, store), 'quiet street');
    expect(store.set).not.toHaveBeenCalled();
  });

  it('asks the LLM when the store fails or holds invalid output', async () => {
    const llm = fakeLlm({ ...empty, text: 'quiet' });
    const broken = fakeStore();
    broken.get.mockRejectedValue(new Error('db down'));
    await expect(
      parse(new LlmQueryParser(llm, 10, broken), 'quiet street')
    ).resolves.toEqual({ text: 'quiet', filter: {} });

    const stale = fakeStore({ '|quiet street': { text: 42 } });
    await parse(new LlmQueryParser(llm, 10, stale), 'quiet street');
    expect(llm.extract).toHaveBeenCalledTimes(2);
  });

  it('still serves stored parses once the daily budget is spent', async () => {
    const llm = fakeLlm({ ...empty, text: 'x' });
    const store = fakeStore({ '|calm': { ...empty, text: 'calm' } });
    const parser = new LlmQueryParser(llm, 1, store);

    await parse(parser, 'quiet');
    await expect(parse(parser, 'calm')).resolves.toEqual({
      text: 'calm',
      filter: {},
    });
    expect(llm.extract).toHaveBeenCalledTimes(1);
  });
});

describe('toParsedQuery', () => {
  it('drops unknown places, bad numbers and unknown property types', () => {
    expect(
      toParsedQuery(
        {
          minRooms: 2.5,
          maxRooms: 99,
          minPrice: 9e6,
          maxPrice: 2e6,
          propertyTypes: ['castle', 'villa', 'villa'],
          places: ['new cairo', 'Atlantis', 'East Cairo'],
          text: ' garden ',
        },
        vocabulary
      )
    ).toEqual({
      text: 'garden',
      filter: {
        propertyTypes: ['villa'],
        areas: ['New Cairo'],
        regions: ['East Cairo'],
      },
    });
  });
});

describe('toParsedQuery size and floor', () => {
  it('keeps valid size and floor ranges', () => {
    expect(
      toParsedQuery(
        { ...empty, minFloorArea: 150, minFloor: 1, maxFloor: 0.5 },
        vocabulary
      )?.filter
    ).toEqual({ minFloorArea: 150, minFloor: 1 });
  });
});

describe('mergeParses', () => {
  it('keeps room and price pairs together', () => {
    expect(
      mergeParses(
        { text: 'x', filter: { minRooms: 3 } },
        { text: 'y', filter: { maxRooms: 4, minPrice: 1e6 } }
      )
    ).toEqual({ text: 'y', filter: { minRooms: 3, minPrice: 1e6 } });
  });
});
