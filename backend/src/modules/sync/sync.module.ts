import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Unit } from '../../common/entities/unit.entity';
import { TypesenseModule } from '../../common/typesense/typesense.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { UnitSyncQueue } from './unit-sync.queue';
import { UnitSyncService } from './unit-sync.service';
import { UnitSyncWorker } from './unit-sync.worker';

@Module({
  imports: [TypeOrmModule.forFeature([Unit]), TypesenseModule, EmbeddingModule],
  providers: [UnitSyncQueue, UnitSyncService, UnitSyncWorker],
  exports: [UnitSyncQueue],
})
export class SyncModule {}
