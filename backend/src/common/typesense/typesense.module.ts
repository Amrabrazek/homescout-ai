import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypesenseService } from './typesense.service';
import { EmbeddingModule } from '../../modules/embedding/embedding.module';

@Module({
  imports: [ConfigModule, EmbeddingModule],
  providers: [TypesenseService],
  exports: [TypesenseService],
})
export class TypesenseModule {}
