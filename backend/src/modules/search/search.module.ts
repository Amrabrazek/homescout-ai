import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SearchService } from './search.service';
import { SearchResolver } from './search.resolver';
import { TypesenseModule } from '../../common/typesense/typesense.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { LlmQueryParser } from './llm-query-parser';
import { createSearchLlm } from './search-llm';

@Module({
  imports: [TypesenseModule, EmbeddingModule],
  providers: [
    SearchService,
    SearchResolver,
    {
      provide: LlmQueryParser,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new LlmQueryParser(
          createSearchLlm(config),
          Number(config.get('SEARCH_LLM_DAILY_LIMIT') ?? 500)
        ),
    },
  ],
  exports: [SearchService],
})
export class SearchModule {}
