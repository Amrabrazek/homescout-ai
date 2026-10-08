import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'pg-boss';
import { UnitSyncJob, UnitSyncQueue } from './unit-sync.queue';
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

    await this.queue.work((jobs) => this.handle(jobs));
    this.logger.log('Unit sync worker started');
  }

  /**
   * Syncs the batch in one go; if that fails, retries unit by unit so only the
   * failing jobs go back to the queue. pg-boss then completes the rest, since
   * it only completes jobs that are still active.
   */
  async handle(jobs: Job<UnitSyncJob>[]): Promise<void> {
    try {
      const result = await this.sync.syncUnits(
        jobs.map((job) => job.data.unitId)
      );
      this.logger.log(
        `Synced ${jobs.length} job(s): ${result.indexed} indexed, ${result.embedded} embedded, ${result.deleted} deleted`
      );
      return;
    } catch (error) {
      if (jobs.length === 1) {
        this.logger.warn(`Sync failed, will retry: ${describe(error)}`);
        throw error;
      }
      this.logger.warn(
        `Sync of ${jobs.length} job(s) failed, retrying one by one: ${describe(error)}`
      );
    }

    for (const job of jobs) {
      try {
        await this.sync.syncUnits([job.data.unitId]);
      } catch (error) {
        this.logger.warn(
          `Sync of unit ${job.data.unitId} failed, will retry: ${describe(error)}`
        );
        await this.queue.fail(job.id, error);
      }
    }
  }
}

function describe(error: any): string {
  return error.message || error.code || String(error);
}
