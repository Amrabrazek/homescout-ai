import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { saveChat } from './chats';
import type { InternalApi } from './api';
import type { ConciergeMessage } from './tools';

describe('saveChat', () => {
  it('drops replies that failed before saying anything', async () => {
    let sent: unknown;
    const api = (async (_method: string, _path: string, body: unknown) => {
      sent = body;
    }) as InternalApi;
    const messages = [
      { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Hi' }] },
      { id: 'a1', role: 'assistant', parts: [{ type: 'step-start' }] },
      { id: 'u2', role: 'user', parts: [{ type: 'text', text: 'Hi?' }] },
      { id: 'a2', role: 'assistant', parts: [{ type: 'text', text: 'Hello' }] },
    ] as ConciergeMessage[];
    await saveChat(api, 'c1', messages);
    assert.deepEqual(
      (sent as { messages: ConciergeMessage[] }).messages.map((m) => m.id),
      ['u1', 'u2', 'a2']
    );
  });
});
