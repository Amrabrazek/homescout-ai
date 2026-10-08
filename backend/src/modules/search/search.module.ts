import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchResolver } from './search.resolver';
import { TypesenseModule } from '../../common/typesense/typesense.module';
import { EmbeddingModule } from '../embedding/embedding.module';

@Module({
  imports: [TypesenseModule, EmbeddingModule],
  providers: [SearchService, SearchResolver],
  exports: [SearchService],
})
export class SearchModule {}
