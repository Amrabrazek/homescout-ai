import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ChatSummarizer, transcript } from './chat-summary';

export const CHAT_SUMMARIZER = Symbol('CHAT_SUMMARIZER');

export interface Conversation {
  id: string;
  messages: Record<string, unknown>[];
}

export interface LastChat {
  summary: string;
  updatedAt: string;
}

const SUMMARY_WAIT_MS = 4_000;
const SUMMARY_TIMEOUT_MS = 20_000;

/**
 * Saved concierge chats. The web app sends only the new message; the stored
 * chat is the history. The previous chat is summarized once, lazily, when the
 * buyer's next chat asks for its context, so only buyers who come back cost a call.
 */
@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);
  private readonly pending = new Map<string, Promise<string | null>>();

  constructor(
    private readonly dataSource: DataSource,
    @Optional()
    @Inject(CHAT_SUMMARIZER)
    private readonly summarizer: ChatSummarizer | null = null
  ) {}

  async get(buyerId: string, id: string): Promise<Conversation | null> {
    const [row] = await this.dataSource.query(
      `SELECT id, messages FROM conversations WHERE id = $1 AND buyer_id = $2`,
      [id, buyerId]
    );
    return row ?? null;
  }

  async latest(buyerId: string): Promise<Conversation | null> {
    const [row] = await this.dataSource.query(
      `SELECT id, messages FROM conversations WHERE buyer_id = $1
       ORDER BY updated_at DESC LIMIT 1`,
      [buyerId]
    );
    return row ?? null;
  }

  /** False when the id belongs to another buyer. A changed chat loses its summary. */
  async save(
    buyerId: string,
    id: string,
    messages: Record<string, unknown>[]
  ): Promise<boolean> {
    await this.dataSource.query(
      `INSERT INTO buyer_profiles (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
      [buyerId]
    );
    const rows = await this.dataSource.query(
      `INSERT INTO conversations (id, buyer_id, messages) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE
         SET messages = EXCLUDED.messages, summary = NULL, updated_at = NOW()
         WHERE conversations.buyer_id = EXCLUDED.buyer_id
       RETURNING id`,
      [id, buyerId, JSON.stringify(messages)]
    );
    return rows.length > 0;
  }

  /**
   * The summary of the buyer's most recent chat other than `currentId`. Waits a
   * few seconds for a new summary; a slower one is still stored for the next turn.
   */
  async lastChat(
    buyerId: string,
    currentId?: string
  ): Promise<LastChat | null> {
    const [row] = await this.dataSource.query(
      `SELECT id, messages, summary, updated_at FROM conversations
       WHERE buyer_id = $1 AND ($2::text IS NULL OR id <> $2)
       ORDER BY updated_at DESC LIMIT 1`,
      [buyerId, currentId ?? null]
    );
    if (!row) return null;
    const updatedAt = new Date(row.updated_at).toISOString();
    if (row.summary) return { summary: row.summary, updatedAt };

    const summary = await Promise.race([
      this.summarize(row.id, row.messages, row.updated_at),
      new Promise<null>((resolve) =>
        setTimeout(resolve, SUMMARY_WAIT_MS, null).unref()
      ),
    ]);
    return summary ? { summary, updatedAt } : null;
  }

  private summarize(
    id: string,
    messages: Record<string, unknown>[],
    updatedAt: Date
  ): Promise<string | null> {
    const text = transcript(messages);
    if (!this.summarizer || !text) return Promise.resolve(null);
    const running = this.pending.get(id);
    if (running) return running;

    const job = this.summarizer
      .summarize(text, AbortSignal.timeout(SUMMARY_TIMEOUT_MS))
      .then(async (summary) => {
        if (!summary) return null;
        // Only if the chat wasn't continued meanwhile; a newer save cleared it on purpose.
        await this.dataSource.query(
          `UPDATE conversations SET summary = $3 WHERE id = $1 AND updated_at = $2`,
          [id, updatedAt, summary]
        );
        return summary;
      })
      .catch((error) => {
        this.logger.warn(`Chat summary failed: ${error.message}`);
        return null;
      })
      .finally(() => this.pending.delete(id));
    this.pending.set(id, job);
    return job;
  }
}
