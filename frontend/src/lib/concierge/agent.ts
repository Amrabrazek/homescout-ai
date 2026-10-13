import { isStepCount } from 'ai';
import type { InternalApi } from './api';
import { cachedSystemOptions, languageModel, type LlmConfig } from './model';
import { CONCIERGE_SYSTEM_PROMPT } from './prompt';
import { conciergeTools } from './tools';

const MAX_STEPS = 6;
const MAX_OUTPUT_TOKENS = 8000;

/**
 * Everything one concierge turn needs except the messages. The chat route
 * streams it and the agent evals run it with generateText, so both test the
 * same prompt, tools and limits.
 */
export function conciergeAgent(config: LlmConfig, api: InternalApi) {
  return {
    model: languageModel(config),
    instructions: {
      role: 'system' as const,
      content: CONCIERGE_SYSTEM_PROMPT,
      providerOptions: cachedSystemOptions(config.provider),
    },
    tools: conciergeTools(api),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    stopWhen: isStepCount(MAX_STEPS),
  };
}
