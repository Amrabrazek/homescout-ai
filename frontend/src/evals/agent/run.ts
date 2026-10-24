import { randomUUID } from 'crypto';
import { generateText, type LanguageModelUsage, type ModelMessage } from 'ai';
import { conciergeAgent } from '@/lib/concierge/agent';
import { internalApi, type InternalApi } from '@/lib/concierge/api';
import { saveChat } from '@/lib/concierge/chats';
import { loadAboutBuyer } from '@/lib/concierge/context';
import { withoutEarlierReasoning } from '@/lib/concierge/history';
import type { LlmConfig } from '@/lib/concierge/model';
import type { ConciergeMessage } from '@/lib/concierge/tools';
import type { UnitSearchResult } from '@/lib/concierge/types';
import type { AgentCase, BuyerSetup } from './cases';
import type { ToolCall, TurnTranscript } from './checks';

export interface TurnRun extends TurnTranscript {
  ms: number;
  usage: LanguageModelUsage;
}

export interface ConversationRun {
  caseId: string;
  model: string;
  run: number;
  turns: TurnRun[];
  /** The "About this buyer" block of each turn, which counts as known data for the grounding check. */
  context: string[];
  /** Set when the API call itself failed; the run counts as failed. */
  error?: string;
}

/**
 * Plays a case's scripted turns against the real concierge (same prompt, tools
 * and limits as /api/chat) as a fresh buyer, so preferences don't leak between
 * runs.
 */
export async function runConversation(
  testCase: AgentCase,
  config: LlmConfig,
  run: number
): Promise<ConversationRun> {
  const api = internalApi(randomUUID());
  const messages: ModelMessage[] = [];
  const turns: TurnRun[] = [];
  const context: string[] = [];
  const model = `${config.provider}/${config.modelId}`;

  try {
    if (testCase.setup) await applySetup(api, testCase.setup);
    const chats = testCase.earlierChat
      ? [testCase.earlierChat, testCase.turns]
      : [testCase.turns];
    for (let chat = 0; chat < chats.length; chat++) {
      // A new chat starts with no messages: only the buyer's account and the
      // previous chat's summary carry over.
      messages.length = 0;
      const chatId = randomUUID();
      const saved: TurnRun[] = [];
      for (let i = 0; i < chats[chat].length; i++) {
        const turn = await playTurn(
          chats[chat][i],
          chatId,
          chat > 0 && i === 0
        );
        turns.push(turn);
        saved.push(turn);
        await saveChat(api, chatId, asSavedChat(saved));
      }
    }
    return { caseId: testCase.id, model, run, turns, context };
  } catch (error) {
    return {
      caseId: testCase.id,
      model,
      run,
      turns,
      context,
      error: String(error),
    };
  }

  async function playTurn(
    user: string,
    chatId: string,
    newChat: boolean
  ): Promise<TurnRun> {
    messages.push({ role: 'user', content: user });
    const aboutBuyer = await loadAboutBuyer(api, chatId);
    if (aboutBuyer) context.push(aboutBuyer);
    const agent = conciergeAgent(config, api, aboutBuyer);
    const started = performance.now();
    const result = await generateText({
      ...agent,
      messages: withoutEarlierReasoning(messages),
    });
    const ms = performance.now() - started;
    messages.push(...result.responseMessages);
    return {
      user,
      reply: result.text,
      toolCalls: toolCallsOf(result.steps),
      ms,
      usage: result.usage,
      ...(newChat ? { newChat } : {}),
    };
  }
}

/** The turns as the chat route would store them, text and tool names only, for the next chat's summary. */
function asSavedChat(turns: TurnRun[]): ConciergeMessage[] {
  return turns.flatMap((turn, i) => [
    {
      id: `u${i}`,
      role: 'user' as const,
      parts: [{ type: 'text' as const, text: turn.user }],
    },
    {
      id: `a${i}`,
      role: 'assistant' as const,
      parts: [
        ...turn.toolCalls.map(
          (call) =>
            ({
              type: `tool-${call.name}`,
              state: 'output-available',
            }) as any
        ),
        { type: 'text' as const, text: turn.reply },
      ],
    },
  ]);
}

/** Gives the fresh buyer saved preferences and saved units, as a returning buyer would have. */
async function applySetup(api: InternalApi, setup: BuyerSetup) {
  const { preferences, saves = 0 } = setup;
  await api('PATCH', '/preferences', preferences);
  if (!saves) return;
  const { units } = await api<UnitSearchResult>('POST', '/units/search', {
    locations: preferences.locations,
    propertyTypes: preferences.propertyTypes,
    minRooms: preferences.minRooms,
    maxPrice: preferences.budgetMax,
    limit: saves,
  });
  for (const unit of units) await api('POST', `/units/${unit.id}/save`);
}

function toolCallsOf(steps: { content: any[] }[]): ToolCall[] {
  const byId = new Map<string, ToolCall>();
  for (const part of steps.flatMap((s) => s.content)) {
    if (part.type === 'tool-call')
      byId.set(part.toolCallId, { name: part.toolName, input: part.input });
    else if (part.type === 'tool-result') {
      const call = byId.get(part.toolCallId);
      if (call) call.output = part.output;
    } else if (part.type === 'tool-error') {
      const call = byId.get(part.toolCallId);
      if (call) call.error = String(part.error);
    }
  }
  return Array.from(byId.values());
}
