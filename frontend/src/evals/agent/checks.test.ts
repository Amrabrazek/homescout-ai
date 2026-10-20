import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AgentCase } from './cases';
import {
  checkConstraints,
  checkGrounded,
  checkRemembers,
  extractPrices,
  runChecks,
  type TurnTranscript,
} from './checks';
import { parseScore } from './judge';
import { costUsd, percentile } from './report';

const unit = (over: Record<string, unknown> = {}) => ({
  id: 'u1',
  name: '2-Bedroom Apartment',
  project: 'Badya',
  developer: 'Palm Hills',
  area: '6th of October',
  city: 'Giza',
  propertyType: 'apartment',
  rooms: 2,
  bathrooms: 1,
  floorArea: 120,
  price: 5_400_000,
  deliveryYear: 2027,
  imageUrl: null,
  ...over,
});

const searchTurn = (
  input: Record<string, unknown>,
  units: unknown[],
  reply = 'Here are some options.'
): TurnTranscript => ({
  user: 'apartment in October under 6M',
  reply,
  toolCalls: [
    {
      name: 'search_units',
      input,
      output: { total: units.length, units, appliedFilters: {}, unmatched: [] },
    },
  ],
});

describe('extractPrices', () => {
  it('reads millions, thousands and full amounts with their precision', () => {
    const prices = extractPrices(
      'From 5.4M EGP to 12 million, 750K down, or 9,500,000 EGP.'
    );
    assert.deepEqual(
      prices.map((p) => [p.value, p.tolerance]),
      [
        [5_400_000, 50_000],
        [12_000_000, 500_000],
        [750_000, 500],
        [9_500_000, 0.5],
      ]
    );
  });

  it('ignores sizes and plain numbers', () => {
    assert.deepEqual(
      extractPrices('120 m², 3 bedrooms, 2 baths, built 2027'),
      []
    );
  });
});

describe('checkGrounded', () => {
  it('passes prices that round to a tool price or come from the buyer', () => {
    const turn = searchTurn(
      { maxPrice: 6_000_000 },
      [unit()],
      'Badya at 5.4M fits your 6M budget.'
    );
    assert.deepEqual(checkGrounded([turn], ['Badya']), { pass: true });
  });

  it('accepts the gap between two tool prices', () => {
    const turn = searchTurn(
      {},
      [unit(), unit({ id: 'u2', price: 7_400_000 })],
      'The second is 2M more.'
    );
    assert.equal(checkGrounded([turn], []).pass, true);
  });

  it('accepts the gap to the budget and the price per m²', () => {
    const turn = searchTurn(
      { maxPrice: 6_000_000 },
      [unit()],
      'It leaves 600K under budget, about 45K EGP/m².'
    );
    assert.equal(checkGrounded([turn], []).pass, true);
  });

  it('counts the buyer context as known data', () => {
    const turn: TurnTranscript = {
      user: 'Anything new?',
      reply: 'Your saved Mivida unit is 13.8M.',
      toolCalls: [],
    };
    const context = ['Saved units:\n- 3-Bedroom Apartment, Mivida, 13.83M EGP'];
    assert.equal(checkGrounded([turn], ['Mivida']).pass, false);
    assert.equal(checkGrounded([turn], ['Mivida'], context).pass, true);
  });

  it('fails a price no tool returned', () => {
    const turn = searchTurn({}, [unit()], 'It costs about 4.1M.');
    const result = checkGrounded([turn], []);
    assert.equal(result.pass, false);
    assert.match(result.detail!, /4\.1M/);
  });

  it('fails a catalog project the tools never returned', () => {
    const turn = searchTurn({}, [unit()], 'You might also like Allegria.');
    const result = checkGrounded([turn], ['Badya', 'Allegria']);
    assert.equal(result.pass, false);
    assert.match(result.detail!, /Allegria/);
  });
});

describe('checkConstraints', () => {
  const expected = {
    places: ['6th of October'],
    propertyTypes: ['apartment' as const],
    minRooms: 2,
    maxPrice: 6_000_000,
  };
  const args = {
    locations: ['October'],
    propertyTypes: ['apartment'],
    minRooms: 2,
    maxPrice: 6_000_000,
  };

  it('passes a search that applies every need', () => {
    assert.deepEqual(checkConstraints(searchTurn(args, [unit()]), expected), {
      pass: true,
    });
  });

  it('fails a missing or looser filter', () => {
    const result = checkConstraints(
      searchTurn({ ...args, maxPrice: 7_000_000, minRooms: undefined }, [
        unit(),
      ]),
      expected
    );
    assert.equal(result.pass, false);
    assert.match(result.detail!, /maxPrice 7000000 > 6000000/);
    assert.match(result.detail!, /minRooms missing/);
  });

  it('fails when a returned unit breaks a need even if the args look right', () => {
    const result = checkConstraints(
      searchTurn(args, [unit({ area: 'Sheikh Zayed', city: 'Giza' })]),
      expected
    );
    assert.equal(result.pass, false);
    assert.match(result.detail!, /1\/1 units break it \(in Sheikh Zayed\)/);
  });

  it('matches a region through the unit city', () => {
    const result = checkConstraints(
      searchTurn({ locations: ['North Coast'] }, [
        unit({ area: 'New Alamein', city: 'North Coast' }),
      ]),
      { places: ['North Coast'] }
    );
    assert.deepEqual(result, { pass: true });
  });
});

describe('runChecks', () => {
  const vague: AgentCase = {
    id: 'v',
    kind: 'vague',
    note: '',
    turns: ['help me find a home'],
    asksFirst: true,
  };

  it('passes a clarifying question with no search', () => {
    const turns = [
      {
        user: 'help me find a home',
        reply: 'What is your budget and area?',
        toolCalls: [],
      },
    ];
    assert.equal(runChecks(vague, turns, []).asksWhenVague?.pass, true);
  });

  it('passes a request for details phrased without a question mark', () => {
    const turns = [
      {
        user: 'help me find a home',
        reply: 'Could you tell me:\n- **Budget:** your maximum in EGP',
        toolCalls: [],
      },
    ];
    assert.equal(runChecks(vague, turns, []).asksWhenVague?.pass, true);
  });

  it('fails a reply that asks nothing', () => {
    const turns = [
      { user: 'help me find a home', reply: 'Happy to help.', toolCalls: [] },
    ];
    assert.equal(runChecks(vague, turns, []).asksWhenVague?.pass, false);
  });

  it('fails a search before asking', () => {
    const turns = [searchTurn({}, [unit()], 'What budget?')];
    assert.equal(runChecks(vague, turns, []).asksWhenVague?.pass, false);
  });

  it('fails an off-topic answer that matches a forbidden pattern', () => {
    const offTopic: AgentCase = {
      id: 'o',
      kind: 'off-topic',
      note: '',
      turns: ['who won the world cup'],
      forbidden: [/argentina/i],
    };
    const turns = [{ user: 'who won', reply: 'Argentina won.', toolCalls: [] }];
    assert.equal(runChecks(offTopic, turns, []).onTopic?.pass, false);
  });
});

describe('remembered facts', () => {
  const said = (
    toolCalls: TurnTranscript['toolCalls'],
    user = 'I have two kids'
  ): TurnTranscript => ({ user, reply: 'Noted!', toolCalls });
  const remember = { name: 'remember_fact', input: { text: 'Has two kids' } };
  const schools = {
    name: 'update_preferences',
    input: { amenities: ['Schools Nearby'] },
  };

  it('passes when the fact is saved and schools come after a yes', () => {
    const result = checkRemembers([said([remember]), said([schools], 'Yes')]);
    assert.deepEqual(result, { pass: true });
  });

  it('fails when nothing was remembered', () => {
    assert.equal(checkRemembers([said([])]).pass, false);
  });

  it('fails when an amenity is added in the same turn as the fact', () => {
    const result = checkRemembers([said([remember, schools])]);
    assert.equal(result.detail, 'added an amenity without asking');
  });

  it('runs on the earlier chat only and checks the new chat search', () => {
    const remembered: AgentCase = {
      id: 'r',
      kind: 'remembered',
      note: '',
      earlierChat: ['I work from home'],
      remembers: true,
      turns: ['Anything new?'],
      search: { noAmenities: true },
    };
    const newChat = {
      ...searchTurn({ amenities: ['Gym'] }, [unit()]),
      newChat: true,
    };
    const checks = runChecks(remembered, [said([remember]), newChat], []);
    assert.equal(checks.remembers?.pass, true);
    assert.equal(checks.constraints?.detail, 'unasked amenities Gym');
    assert.equal(checks.savesPreferences, undefined);
  });
});

describe('report helpers', () => {
  it('prices cache reads and writes', () => {
    const cost = costUsd('claude-sonnet-5-5', {
      inputTokens: 3_000,
      outputTokens: 1_000,
      inputTokenDetails: {
        noCacheTokens: 1_000,
        cacheReadTokens: 1_000,
        cacheWriteTokens: 1_000,
      },
    } as any);
    assert.equal(cost!.toFixed(6), (0.002 + 0.0002 + 0.0025 + 0.01).toFixed(6));
  });

  it('takes nearest-rank percentiles', () => {
    assert.equal(percentile([1, 2, 3, 4], 50), 2);
    assert.equal(percentile([1, 2, 3, 4], 95), 4);
  });

  it('parses the judge JSON and rejects a missing score', () => {
    assert.deepEqual(parseScore('Sure: {"score": 4, "reason": "ok"}'), {
      score: 4,
      reason: 'ok',
    });
    assert.throws(() => parseScore('{"score": 9}'));
  });
});
