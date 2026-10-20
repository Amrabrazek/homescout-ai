import { randomUUID } from 'crypto';
import { generateText, type LanguageModelUsage, type ModelMessage } from 'ai';
import { conciergeAgent } from '@/lib/concierge/agent';
import { internalApi, type InternalApi } from '@/lib/concierge/api';
import { loadAboutBuyer } from '@/lib/concierge/context';
import { withoutEarlierReasoning } from '@/lib/concierge/history';
import type { LlmConfig } from '@/lib/concierge/model';
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
      // A new chat starts with no messages: only the buyer's account carries over.
      messages.length = 0;
      for (let i = 0; i < chats[chat].length; i++)
        turns.push(await playTurn(chats[chat][i], chat > 0 && i === 0));
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

  async function playTurn(user: string, newChat: boolean): Promise<TurnRun> {
    messages.push({ role: 'user', content: user });
    const aboutBuyer = await loadAboutBuyer(api);
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
