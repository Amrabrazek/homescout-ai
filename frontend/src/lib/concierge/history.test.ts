import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ModelMessage } from 'ai';
import { withoutEarlierReasoning } from './history';

describe('withoutEarlierReasoning', () => {
  it('drops reasoning parts from assistant messages and keeps the rest', () => {
    const messages: ModelMessage[] = [
      { role: 'user', content: 'I have two kids' },
      {
        role: 'assistant',
        content: [
          { type: 'reasoning', text: '' },
          { type: 'text', text: 'Add Schools Nearby to your preferences?' },
        ],
      },
      { role: 'user', content: 'yes please' },
    ];

    const result = withoutEarlierReasoning(messages);

    assert.deepEqual(result[1], {
      role: 'assistant',
      content: [
        { type: 'text', text: 'Add Schools Nearby to your preferences?' },
      ],
    });
    assert.equal(result[0], messages[0]);
    assert.equal(result[2], messages[2]);
  });

  it('leaves string assistant content alone', () => {
    const messages: ModelMessage[] = [{ role: 'assistant', content: 'Hi' }];
    assert.deepEqual(withoutEarlierReasoning(messages), messages);
  });
});
