import { ConfigService } from '@nestjs/config';
import type { LanguageModel } from 'ai';

const DEFAULT_MODELS = {
  anthropic: 'claude-haiku-5-5',
  openai: 'gpt-5-mini',
} as const;

const API_KEYS: Record<keyof typeof DEFAULT_MODELS, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
};

export interface LlmModel {
  /** provider/model, for logs and cache keys. */
  readonly name: string;
  load(): Promise<LanguageModel>;
}

/**
 * The concierge's LLM_PROVIDER / LLM_MODEL, or null when that provider has no
 * API key. The SDKs are ESM-only, so they load on first use.
 */
export function llmModel(config: ConfigService): LlmModel | null {
  const provider = (
    config.get<string>('LLM_PROVIDER') || 'anthropic'
  ).toLowerCase() as keyof typeof DEFAULT_MODELS;
  if (!(provider in DEFAULT_MODELS)) return null;
  if (!config.get<string>(API_KEYS[provider])) return null;
  const modelId = config.get<string>('LLM_MODEL') || DEFAULT_MODELS[provider];

  return {
    name: `${provider}/${modelId}`,
    load: async () =>
      provider === 'openai'
        ? (await import('@ai-sdk/openai')).createOpenAI()(modelId)
        : (await import('@ai-sdk/anthropic')).createAnthropic()(modelId),
  };
}
