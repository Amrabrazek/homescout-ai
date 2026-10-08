export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');

export const EMBEDDING_MODELS = {
  'local-e5-small': { dimensions: 384 },
  'openai-text-embedding-3-small': { dimensions: 1536 },
} as const;

export type EmbeddingModel = keyof typeof EMBEDDING_MODELS;

export const DEFAULT_EMBEDDING_MODEL: EmbeddingModel = 'local-e5-small';

export interface EmbeddingProvider {
  readonly model: EmbeddingModel;
  readonly dimensions: number;
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

export function resolveEmbeddingModel(
  value: string | undefined
): EmbeddingModel {
  const model = value?.trim() || DEFAULT_EMBEDDING_MODEL;
  if (!(model in EMBEDDING_MODELS)) {
    throw new Error(
      `Unknown EMBEDDING_MODEL "${model}". Use one of: ${Object.keys(EMBEDDING_MODELS).join(', ')}`
    );
  }
  return model as EmbeddingModel;
}
