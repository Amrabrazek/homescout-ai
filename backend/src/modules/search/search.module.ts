import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchResolver } from './search.resolver';
import { TypesenseModule } from '../../common/typesense/typesense.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Unit } from '../../common/entities/unit.entity';

@Module({
  imports: [TypesenseModule, ConfigModule, TypeOrmModule.forFeature([Unit])],
  providers: [SearchService, SearchResolver],
  exports: [SearchService],
})
export class SearchModule {}
