import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

const DEFAULT_MODELS = {
  anthropic: 'claude-haiku-5-5',
  openai: 'gpt-5-mini',
} as const;

export type LlmProvider = keyof typeof DEFAULT_MODELS;

export interface LlmConfig {
  provider: LlmProvider;
  modelId: string;
}

/** LLM_PROVIDER and LLM_MODEL pick the model; nothing else changes. */
export function llmConfig(env = process.env): LlmConfig {
  const provider = (env.LLM_PROVIDER || 'anthropic').toLowerCase();
  if (!(provider in DEFAULT_MODELS)) {
    throw new Error(
      `Unsupported LLM_PROVIDER "${provider}"; use ${Object.keys(DEFAULT_MODELS).join(' or ')}`
    );
  }
  const typed = provider as LlmProvider;
  return { provider: typed, modelId: env.LLM_MODEL || DEFAULT_MODELS[typed] };
}

export function languageModel({ provider, modelId }: LlmConfig): LanguageModel {
  return provider === 'openai'
    ? createOpenAI()(modelId)
    : createAnthropic()(modelId);
}

/**
 * Marks the system prompt as a cache breakpoint. Anthropic renders tools before
 * the system prompt, so this caches both. OpenAI caches long prefixes on its own.
 */
export function cachedSystemOptions(provider: LlmProvider) {
  return provider === 'anthropic'
    ? { anthropic: { cacheControl: { type: 'ephemeral' as const } } }
    : undefined;
}
