import { randomUUID } from 'crypto';
import { generateText, type LanguageModelUsage, type ModelMessage } from 'ai';
import { conciergeAgent } from '@/lib/concierge/agent';
import { internalApi } from '@/lib/concierge/api';
import type { LlmConfig } from '@/lib/concierge/model';
import type { AgentCase } from './cases';
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
  const agent = conciergeAgent(config, internalApi(randomUUID()));
  const messages: ModelMessage[] = [];
  const turns: TurnRun[] = [];
  const model = `${config.provider}/${config.modelId}`;

  try {
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
