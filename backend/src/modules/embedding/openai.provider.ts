import axios from 'axios';
import { EMBEDDING_MODELS, EmbeddingProvider } from './embedding.provider';

const BATCH_SIZE = 256;

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly model = 'openai-text-embedding-3-small' as const;
  readonly dimensions =
    EMBEDDING_MODELS['openai-text-embedding-3-small'].dimensions;

  constructor(private readonly apiKey: string | undefined) {}

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (let start = 0; start < texts.length; start += BATCH_SIZE) {
      vectors.push(
        ...(await this.embed(texts.slice(start, start + BATCH_SIZE)))
      );
    }
    return vectors;
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embed([text]);
    return vector;
  }

  private async embed(input: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error(
        'OPENAI_API_KEY is required for EMBEDDING_MODEL=openai-text-embedding-3-small'
      );
    }
    const response = await axios.post<{
      data: { index: number; embedding: number[] }[];
    }>(
      'https://api.openai.com/v1/embeddings',
      { model: 'text-embedding-3-small', input },
      { headers: { Authorization: `Bearer ${this.apiKey}` }, timeout: 30_000 }
    );
    return response.data.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }
}
