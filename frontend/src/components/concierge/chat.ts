'use client';

import { Chat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { SavedChat } from '@/lib/concierge/chats';
import type { ConciergeMessage } from '@/lib/concierge/tools';

// The server keeps the history, so each request carries only the new message.
const transport = new DefaultChatTransport<ConciergeMessage>({
  api: '/api/chat',
  prepareSendMessagesRequest: ({ id, messages }) => ({
    body: { id, message: messages[messages.length - 1] },
  }),
});

const listeners = new Set<() => void>();
const finishListeners = new Set<(message: ConciergeMessage) => void>();
let current = createChat();
let resumeStarted = false;

function createChat(saved?: SavedChat) {
  return new Chat<ConciergeMessage>({
    transport,
    ...saved,
    // useChat ignores its own callbacks for a chat made outside it.
    onFinish: ({ message }) => finishListeners.forEach((f) => f(message)),
  });
}

function replace(chat: Chat<ConciergeMessage>) {
  current = chat;
  listeners.forEach((l) => l());
}

/** One conversation shared by the floating panel and the /concierge page. */
export function useConciergeChat(): Chat<ConciergeMessage> {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => current
  );
}

export function useOnChatFinish(callback: (message: ConciergeMessage) => void) {
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    const listener = (message: ConciergeMessage) => latest.current(message);
    finishListeners.add(listener);
    return () => {
      finishListeners.delete(listener);
    };
  }, []);
}

/** A fresh chat; the old one stays saved and is summarized when this one starts. */
export function startNewChat() {
  current.stop();
  replace(createChat());
}

/** Reopens the buyer's latest saved chat, once per page load, unless they already started a new one. */
export async function resumeLatestChat() {
  if (resumeStarted) return;
  resumeStarted = true;
  const response = await fetch('/api/chat').catch(() => null);
  if (!response?.ok) return;
  const saved: SavedChat | null = await response.json();
  if (saved && current.messages.length === 0) replace(createChat(saved));
}
