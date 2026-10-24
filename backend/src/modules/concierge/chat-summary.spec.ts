import { transcript } from './chat-summary';

describe('transcript', () => {
  it('keeps text, notes finished tool calls and skips the rest', () => {
    expect(
      transcript([
        { role: 'user', parts: [{ type: 'text', text: ' 3BR in Zayed ' }] },
        {
          role: 'assistant',
          parts: [
            { type: 'reasoning', text: 'thinking' },
            { type: 'tool-search_units', state: 'output-available' },
            { type: 'tool-save_unit', state: 'output-error' },
            { type: 'text', text: 'Found two.' },
          ],
        },
        { role: 'assistant', parts: 'not an array' },
      ])
    ).toBe('Buyer: 3BR in Zayed\nConcierge: [search_units] Found two.');
  });

  it('keeps the end of a long chat', () => {
    const long = 'x'.repeat(20_000);
    const text = transcript([
      { role: 'user', parts: [{ type: 'text', text: long }] },
      { role: 'user', parts: [{ type: 'text', text: 'last ask' }] },
    ]);
    expect(text.length).toBe(12_000);
    expect(text.endsWith('Buyer: last ask')).toBe(true);
  });
});
