import { convertToModelMessages, safeValidateUIMessages, streamText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { getBuyerId } from '@/lib/graphql/buyer/server';
import { conciergeAgent } from '@/lib/concierge/agent';
import { internalApi } from '@/lib/concierge/api';
import { loadAboutBuyer } from '@/lib/concierge/context';
import { llmConfig } from '@/lib/concierge/model';
import { langfuse } from '@/lib/concierge/telemetry';
import type { ConciergeMessage } from '@/lib/concierge/tools';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_MESSAGES = 60;

/** One concierge turn: the model calls tools against the API, streamed to useChat. */
export async function POST(request: NextRequest) {
  const buyerId = getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: 'No buyer cookie' }, { status: 401 });
  }

  const config = llmConfig();
  const api = internalApi(buyerId);
  const agent = conciergeAgent(config, api, await loadAboutBuyer(api));
  const { tools } = agent;
  const body = await request.json().catch(() => null);
  const parsed = await safeValidateUIMessages<ConciergeMessage>({
    messages: body?.messages,
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
    sessionId: typeof body?.id === 'string' ? body.id : undefined,
    input: lastUserText(messages),
    metadata: config,
  });
  let stepStart = new Date();

  const result = streamText({
    ...agent,
    messages: await convertToModelMessages(messages, { tools }),
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

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
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
