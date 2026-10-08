import { Logger } from '@nestjs/common';
import type { FeatureExtractionPipeline } from '@huggingface/transformers';
import { EMBEDDING_MODELS, EmbeddingProvider } from './embedding.provider';

const HF_MODEL = 'Xenova/multilingual-e5-small';
const BATCH_SIZE = 32;

// e5 models are trained with these prefixes; omitting them hurts retrieval quality.
const PASSAGE_PREFIX = 'passage: ';
const QUERY_PREFIX = 'query: ';

export class LocalE5Provider implements EmbeddingProvider {
  readonly model = 'local-e5-small' as const;
  readonly dimensions = EMBEDDING_MODELS['local-e5-small'].dimensions;
  private readonly logger = new Logger(LocalE5Provider.name);
  private extractor?: Promise<FeatureExtractionPipeline>;

  constructor(private readonly cacheDir?: string) {}

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (let start = 0; start < texts.length; start += BATCH_SIZE) {
      const batch = texts.slice(start, start + BATCH_SIZE);
      vectors.push(...(await this.embed(batch.map((t) => PASSAGE_PREFIX + t))));
    }
    return vectors;
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embed([QUERY_PREFIX + text]);
    return vector;
  }

  private async embed(inputs: string[]): Promise<number[][]> {
    const extractor = await this.load();
    const output = await extractor(inputs, {
      pooling: 'mean',
      normalize: true,
    });
    return output.tolist() as number[][];
  }

  private load(): Promise<FeatureExtractionPipeline> {
    this.extractor ??= (async () => {
      const { env, pipeline } = await import('@huggingface/transformers');
      if (this.cacheDir) env.cacheDir = this.cacheDir;
      this.logger.log(`Loading ${HF_MODEL} (downloaded on first use)`);
      return pipeline('feature-extraction', HF_MODEL, { dtype: 'q8' });
    })().catch((error) => {
      this.extractor = undefined;
      throw error;
    });
    return this.extractor;
  }
}
