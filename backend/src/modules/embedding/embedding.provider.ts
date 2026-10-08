export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');

/**
 * maxDistance is the cosine distance above which a vector hit counts as
 * unrelated and is dropped from hybrid search. e5 scores cluster high
 * (unrelated text is often ~0.75 similar), so its cutoff is much tighter.
 */
export const EMBEDDING_MODELS = {
  'local-e5-small': { dimensions: 384, maxDistance: 0.2 },
  'openai-text-embedding-3-small': { dimensions: 1536, maxDistance: 0.6 },
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
