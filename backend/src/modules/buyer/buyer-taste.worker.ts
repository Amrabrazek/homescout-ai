import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BuyerTasteQueue } from './buyer-taste.queue';
import { BuyerService } from './buyer.service';

@Injectable()
export class BuyerTasteWorker implements OnApplicationBootstrap {
  private readonly logger = new Logger(BuyerTasteWorker.name);

  constructor(
    private readonly config: ConfigService,
    private readonly queue: BuyerTasteQueue,
    private readonly buyers: BuyerService
  ) {}

  async onApplicationBootstrap() {
    if (this.config.get<string>('WORKER', 'true') === 'false') return;

    await this.queue.work(async (jobs) => {
      const buyerIds = [...new Set(jobs.map((job) => job.data.buyerId))];
      for (const buyerId of buyerIds) {
        await this.buyers.recomputeTaste(buyerId);
      }
      this.logger.log(`Recomputed taste for ${buyerIds.length} buyer(s)`);
    });
    this.logger.log('Buyer taste worker started');
  }
}
