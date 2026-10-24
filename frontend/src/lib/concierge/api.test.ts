import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { internalApi } from './api';

const realFetch = globalThis.fetch;

function failOnce() {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    if (calls === 1) throw new TypeError('fetch failed');
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  return () => calls;
}

describe('internalApi', () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('retries an idempotent call once after a network error', async () => {
    const calls = failOnce();
    await internalApi('b')('PUT', '/conversations/c1', { messages: [] });
    assert.equal(calls(), 2);
  });

  it('does not repeat a POST', async () => {
    const calls = failOnce();
    await assert.rejects(internalApi('b')('POST', '/facts', { text: 'x' }));
    assert.equal(calls(), 1);
  });
});
