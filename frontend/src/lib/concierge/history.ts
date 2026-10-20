import type { ModelMessage } from 'ai';

/**
 * Removes reasoning from earlier turns. A thinking block's signature is bound to
 * the system prompt it was written under, and the "About this buyer" block
 * changes as soon as a turn saves a preference or a fact, so replaying old
 * blocks makes the next turn fail. Dropping them from the front is allowed.
 */
export function withoutEarlierReasoning(
  messages: ModelMessage[]
): ModelMessage[] {
  return messages.map((message) =>
    message.role === 'assistant' && Array.isArray(message.content)
      ? {
          ...message,
          content: message.content.filter((part) => part.type !== 'reasoning'),
        }
      : message
  );
}
