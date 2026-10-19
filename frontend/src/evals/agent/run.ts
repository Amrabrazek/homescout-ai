import { randomUUID } from 'crypto';
import { generateText, type LanguageModelUsage, type ModelMessage } from 'ai';
import { conciergeAgent } from '@/lib/concierge/agent';
import { internalApi, type InternalApi } from '@/lib/concierge/api';
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
  const agent = conciergeAgent(config, api);
  const messages: ModelMessage[] = [];
  const turns: TurnRun[] = [];
  const model = `${config.provider}/${config.modelId}`;

  try {
    if (testCase.setup) await applySetup(api, testCase.setup);
    for (const user of testCase.turns) {
      messages.push({ role: 'user', content: user });
      const started = performance.now();
      const result = await generateText({ ...agent, messages });
      const ms = performance.now() - started;
      messages.push(...result.responseMessages);
      turns.push({
        user,
        reply: result.text,
        toolCalls: toolCallsOf(result.steps),
        ms,
        usage: result.usage,
      });
    }
    return { caseId: testCase.id, model, run, turns };
  } catch (error) {
    return { caseId: testCase.id, model, run, turns, error: String(error) };
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
