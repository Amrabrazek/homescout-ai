import { Module } from '@nestjs/common';
import { PgBossService } from './pg-boss.service';

@Module({
  providers: [PgBossService],
  exports: [PgBossService],
})
export class QueueModule {}
