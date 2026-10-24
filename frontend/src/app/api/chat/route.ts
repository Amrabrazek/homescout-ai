import {
  convertToModelMessages,
  createIdGenerator,
  safeValidateUIMessages,
  streamText,
} from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { getBuyerId } from '@/lib/graphql/buyer/server';
import { conciergeAgent } from '@/lib/concierge/agent';
import { internalApi } from '@/lib/concierge/api';
import { CHAT_ID, latestChat, loadChat, saveChat } from '@/lib/concierge/chats';
import { loadAboutBuyer } from '@/lib/concierge/context';
import { withoutEarlierReasoning } from '@/lib/concierge/history';
import { llmConfig } from '@/lib/concierge/model';
import { langfuse } from '@/lib/concierge/telemetry';
import type { ConciergeMessage } from '@/lib/concierge/tools';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_MESSAGES = 60;
const messageId = createIdGenerator({ prefix: 'msg', size: 16 });

/** The buyer's latest saved chat, so the panel can resume it after a reload. */
export async function GET() {
  const buyerId = getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: 'No buyer cookie' }, { status: 401 });
  }
  return NextResponse.json(await latestChat(internalApi(buyerId)));
}

/**
 * One concierge turn: the model calls tools against the API, streamed to
 * useChat. The browser sends only the new message; the history is the saved
 * chat, so it can't be edited client-side.
 */
export async function POST(request: NextRequest) {
  const buyerId = getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: 'No buyer cookie' }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const chatId: unknown = body?.id;
  const message = body?.message;
  if (
    typeof chatId !== 'string' ||
    !CHAT_ID.test(chatId) ||
    message?.role !== 'user'
  ) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
  }

  const config = llmConfig();
  const api = internalApi(buyerId);
  const [stored, aboutBuyer] = await Promise.all([
    loadChat(api, chatId),
    loadAboutBuyer(api, chatId),
  ]);
  const agent = conciergeAgent(config, api, aboutBuyer);
  const { tools } = agent;
  const parsed = await safeValidateUIMessages<ConciergeMessage>({
    messages: [
      ...stored.filter((m) => (m as { id?: unknown }).id !== message.id),
      message,
    ],
    tools: tools as any,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });
  }
  const messages = parsed.data;
  if (messages.length > MAX_MESSAGES) {
    return NextResponse.json(
      { error: 'This chat is too long. Start a new one to continue.' },
      { status: 413 }
    );
  }

  const trace = langfuse()?.trace({
    name: 'concierge-turn',
    userId: buyerId,
    sessionId: chatId,
    input: lastUserText(messages),
    metadata: config,
  });
  let stepStart = new Date();

  const result = streamText({
    ...agent,
    messages: withoutEarlierReasoning(
      await convertToModelMessages(messages, { tools })
    ),
    onStepFinish: (step) => {
      const endTime = new Date();
      trace?.generation({
        name: `step-${step.stepNumber}`,
        model: step.response.modelId,
        startTime: stepStart,
        endTime,
        output: step.text || undefined,
        usage: {
          input: step.usage.inputTokens,
          output: step.usage.outputTokens,
          total: step.usage.totalTokens,
        },
        metadata: {
          finishReason: step.finishReason,
          cacheReadTokens: step.usage.inputTokenDetails?.cacheReadTokens,
          cacheWriteTokens: step.usage.inputTokenDetails?.cacheWriteTokens,
        },
      });
      for (const call of step.toolCalls) {
        const toolResult = step.toolResults.find(
          (r) => r.toolCallId === call.toolCallId
        );
        trace?.span({
          name: `tool:${call.toolName}`,
          input: call.input,
          output: toolResult?.output,
        });
      }
      stepStart = endTime;
    },
    onFinish: async ({ text, totalUsage }) => {
      trace?.update({
        output: text,
        metadata: { ...config, totalUsage },
      });
      await langfuse()?.flushAsync();
    },
    onError: async ({ error }) => {
      console.error('Concierge turn failed', error);
      trace?.update({ metadata: { error: String(error) } });
      await langfuse()?.flushAsync();
    },
  });

  // Finish (and save) the turn even if the buyer closes the tab mid-stream.
  result.consumeStream();

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: messageId,
    onEnd: ({ messages: chat }) =>
      saveChat(api, chatId, chat).catch((error) =>
        console.error('Saving the chat failed', error)
      ),
    onError: (error) =>
      error instanceof Error && /api key|apikey/i.test(error.message)
        ? 'The concierge is not configured: set an LLM API key.'
        : 'Something went wrong. Please try again.',
  });
}

function lastUserText(messages: ConciergeMessage[]): string | undefined {
  const last = [...messages].reverse().find((m) => m.role === 'user');
  return last?.parts
    .map((p) => (p.type === 'text' ? p.text : ''))
    .join('')
    .trim();
}
