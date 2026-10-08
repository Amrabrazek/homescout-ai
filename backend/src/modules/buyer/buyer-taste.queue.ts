import { Injectable, OnModuleInit } from '@nestjs/common';
import PgBoss = require('pg-boss');
import { EntityManager } from 'typeorm';
import { PgBossService } from '../../common/queue/pg-boss.service';

export const BUYER_TASTE_QUEUE = 'buyer-taste';

export interface BuyerTasteJob {
  buyerId: string;
}

/** Buyers whose taste vector must be recomputed from their events. */
@Injectable()
export class BuyerTasteQueue implements OnModuleInit {
  constructor(private readonly pgBoss: PgBossService) {}

  async onModuleInit() {
    await this.pgBoss.boss.createQueue(BUYER_TASTE_QUEUE, {
      name: BUYER_TASTE_QUEUE,
      retryLimit: 5,
      retryDelay: 2,
      retryBackoff: true,
    });
  }

  async enqueue(buyerId: string, manager?: EntityManager): Promise<void> {
    await this.pgBoss.insert(
      [
        {
          name: BUYER_TASTE_QUEUE,
          data: { buyerId } satisfies BuyerTasteJob,
        },
      ],
      manager
    );
  }

  work(
    handler: (jobs: PgBoss.Job<BuyerTasteJob>[]) => Promise<void>
  ): Promise<string> {
    return this.pgBoss.boss.work<BuyerTasteJob>(
      BUYER_TASTE_QUEUE,
      { batchSize: 50, pollingIntervalSeconds: 1 },
      handler
    );
  }
}
