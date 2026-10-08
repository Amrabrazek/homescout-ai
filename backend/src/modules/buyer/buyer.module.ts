import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuyerProfile } from '../../common/entities/buyer-profile.entity';
import { QueueModule } from '../../common/queue/queue.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { UnitModule } from '../unit/unit.module';
import { BuyerTasteQueue } from './buyer-taste.queue';
import { BuyerTasteWorker } from './buyer-taste.worker';
import { BuyerResolver } from './buyer.resolver';
import { BuyerService } from './buyer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BuyerProfile]),
    QueueModule,
    EmbeddingModule,
    UnitModule,
  ],
  providers: [BuyerService, BuyerResolver, BuyerTasteQueue, BuyerTasteWorker],
  exports: [BuyerService],
})
export class BuyerModule {}
