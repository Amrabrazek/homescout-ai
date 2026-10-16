import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { SearchService } from './search.service';
import { SearchResolver } from './search.resolver';
import { TypesenseModule } from '../../common/typesense/typesense.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { LlmQueryParser } from './llm-query-parser';
import { createSearchLlm } from './search-llm';
import { PgParseCache } from './parse-cache';

@Module({
  imports: [TypesenseModule, EmbeddingModule],
  providers: [
    SearchService,
    SearchResolver,
    {
      provide: LlmQueryParser,
      inject: [ConfigService, DataSource],
      useFactory: (config: ConfigService, dataSource: DataSource) => {
        const llm = createSearchLlm(config);
        const ttlDays = Number(config.get('SEARCH_PARSE_CACHE_DAYS') ?? 30);
        const store =
          llm && ttlDays > 0
            ? new PgParseCache(dataSource, ttlDays)
            : undefined;
        store
          ?.prune()
          .catch((error) =>
            new Logger(SearchModule.name).warn(
              `Parse cache prune failed: ${error.message}`
            )
          );
        return new LlmQueryParser(
          llm,
          Number(config.get('SEARCH_LLM_DAILY_LIMIT') ?? 500),
          store
        );
      },
    },
  ],
  exports: [SearchService],
})
export class SearchModule {}
