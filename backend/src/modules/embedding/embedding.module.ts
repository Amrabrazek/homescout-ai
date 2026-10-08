import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EMBEDDING_PROVIDER,
  EmbeddingProvider,
  resolveEmbeddingModel,
} from './embedding.provider';
import { LocalE5Provider } from './local-e5.provider';
import { OpenAIEmbeddingProvider } from './openai.provider';

export function createEmbeddingProvider(
  config: ConfigService
): EmbeddingProvider {
  const model = resolveEmbeddingModel(config.get<string>('EMBEDDING_MODEL'));
  switch (model) {
    case 'local-e5-small':
      return new LocalE5Provider(config.get<string>('EMBEDDING_CACHE_DIR'));
    case 'openai-text-embedding-3-small':
      return new OpenAIEmbeddingProvider(config.get<string>('OPENAI_API_KEY'));
  }
}

@Module({
  providers: [
    {
      provide: EMBEDDING_PROVIDER,
      inject: [ConfigService],
      useFactory: createEmbeddingProvider,
    },
  ],
  exports: [EMBEDDING_PROVIDER],
})
export class EmbeddingModule {}
