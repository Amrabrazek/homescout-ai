import { InternalApiError, type InternalApi } from './api';
import type { ConciergeMessage } from './tools';

/** Made by the browser, so checked here and again by the API. */
export const CHAT_ID = /^[A-Za-z0-9_-]{1,64}$/;

export interface SavedChat {
  id: string;
  messages: ConciergeMessage[];
}

/** The stored messages of a chat, or none for a chat that hasn't been saved yet. */
export async function loadChat(
  api: InternalApi,
  id: string
): Promise<unknown[]> {
  try {
    return (await api<{ messages: unknown[] }>('GET', `/conversations/${id}`))
      .messages;
  } catch (error) {
    if (error instanceof InternalApiError && error.status === 404) return [];
    throw error;
  }
}

export async function latestChat(api: InternalApi): Promise<SavedChat | null> {
  const chat = await api<Partial<SavedChat>>('GET', '/conversations/latest');
  return chat.id && chat.messages ? (chat as SavedChat) : null;
}

/** Saves the chat without replies that failed before saying anything, which the next turn couldn't replay. */
export function saveChat(
  api: InternalApi,
  id: string,
  messages: ConciergeMessage[]
): Promise<void> {
  return api('PUT', `/conversations/${id}`, {
    messages: messages.filter((m) => m.role !== 'assistant' || hasContent(m)),
  });
}

function hasContent(message: ConciergeMessage): boolean {
  return message.parts.some(
    (p) => (p.type === 'text' && p.text.trim()) || p.type.startsWith('tool-')
  );
}
