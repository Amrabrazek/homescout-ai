'use client';

import { Chat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { ConciergeMessage } from '@/lib/concierge/tools';

/** One conversation shared by the floating panel and the /concierge page. */
export const conciergeChat = new Chat<ConciergeMessage>({
  transport: new DefaultChatTransport({ api: '/api/chat' }),
});
