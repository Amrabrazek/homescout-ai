import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnitSyncQueue } from './unit-sync.queue';
import { UnitSyncService } from './unit-sync.service';

@Injectable()
export class UnitSyncWorker implements OnApplicationBootstrap {
  private readonly logger = new Logger(UnitSyncWorker.name);

  constructor(
    private readonly config: ConfigService,
    private readonly queue: UnitSyncQueue,
    private readonly sync: UnitSyncService
  ) {}

  async onApplicationBootstrap() {
    if (this.config.get<string>('WORKER', 'true') === 'false') return;

    await this.queue.work(async (jobs) => {
      try {
        const result = await this.sync.syncUnits(
          jobs.map((job) => job.data.unitId)
        );
        this.logger.log(
          `Synced ${jobs.length} job(s): ${result.indexed} indexed, ${result.embedded} embedded, ${result.deleted} deleted`
        );
      } catch (error) {
        this.logger.warn(
          `Sync of ${jobs.length} job(s) failed, will retry: ${error.message || error.code || error}`
        );
        throw error;
      }
    });
    this.logger.log('Unit sync worker started');
  }
}
