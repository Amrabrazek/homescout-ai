import { DataSource } from 'typeorm';
import { ChatSummarizer } from './chat-summary';
import { ConversationService } from './conversation.service';

const BUYER = '11111111-2222-4333-8444-555555555555';
const UPDATED = new Date('2026-10-20T10:00:00Z');
const VERSION = '2026-10-20 10:00:00.123456+00';
const MESSAGES = [{ role: 'user', parts: [{ type: 'text', text: 'Villas?' }] }];

function setup(row: Record<string, unknown> | undefined) {
  const query = jest.fn<Promise<unknown[]>, [string, unknown[]]>(async (sql) =>
    sql.trim().startsWith('SELECT') && row ? [row] : []
  );
  const summarize = jest.fn<Promise<string>, [string, AbortSignal]>(
    async () => 'The buyer wanted villas.'
  );
  const service = (summarizer: ChatSummarizer | null = { summarize }) =>
    new ConversationService({ query } as unknown as DataSource, summarizer);
  return { query, summarize, service };
}

describe('ConversationService.lastChat', () => {
  it('returns a stored summary without calling the LLM', async () => {
    const { summarize, service } = setup({
      id: 'old',
      messages: MESSAGES,
      summary: 'Stored.',
      updated_at: UPDATED,
      version: VERSION,
    });
    await expect(service().lastChat(BUYER, 'new')).resolves.toEqual({
      summary: 'Stored.',
      updatedAt: UPDATED.toISOString(),
    });
    expect(summarize).not.toHaveBeenCalled();
  });

  it('summarizes the previous chat once and stores it if unchanged', async () => {
    const { query, summarize, service } = setup({
      id: 'old',
      messages: MESSAGES,
      summary: null,
      updated_at: UPDATED,
      version: VERSION,
    });
    const conversations = service();
    const [a, b] = await Promise.all([
      conversations.lastChat(BUYER, 'new'),
      conversations.lastChat(BUYER, 'new'),
    ]);
    expect(a?.summary).toBe('The buyer wanted villas.');
    expect(b).toEqual(a);
    expect(summarize).toHaveBeenCalledTimes(1);
    expect(summarize.mock.calls[0][0]).toBe('Buyer: Villas?');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE conversations SET summary'),
      ['old', VERSION, 'The buyer wanted villas.']
    );
    expect(query.mock.calls[0][1]).toEqual([BUYER, 'new']);
  });

  it('is null with no earlier chat, no LLM, or a failed summary', async () => {
    await expect(setup(undefined).service().lastChat(BUYER)).resolves.toBe(
      null
    );
    const row = {
      id: 'old',
      messages: MESSAGES,
      summary: null,
      updated_at: UPDATED,
      version: VERSION,
    };
    await expect(setup(row).service(null).lastChat(BUYER)).resolves.toBe(null);
    const failing = setup(row);
    failing.summarize.mockRejectedValueOnce(new Error('down'));
    await expect(failing.service().lastChat(BUYER)).resolves.toBe(null);
  });
});
