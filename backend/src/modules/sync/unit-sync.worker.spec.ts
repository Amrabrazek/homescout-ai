import PgBoss = require('pg-boss');
import { UnitSyncJob, UnitSyncQueue } from './unit-sync.queue';
import { UnitSyncService } from './unit-sync.service';
import { UnitSyncWorker } from './unit-sync.worker';

const job = (unitId: string) =>
  ({ id: `job-${unitId}`, data: { unitId } }) as PgBoss.Job<UnitSyncJob>;

describe('UnitSyncWorker.handle', () => {
  const result = { indexed: 1, embedded: 0, deleted: 0 };
  let syncUnits: jest.Mock;
  let fail: jest.Mock;
  let worker: UnitSyncWorker;

  beforeEach(() => {
    syncUnits = jest.fn();
    fail = jest.fn();
    worker = new UnitSyncWorker(
      {} as never,
      { fail } as unknown as UnitSyncQueue,
      { syncUnits } as unknown as UnitSyncService
    );
  });

  it('syncs the whole batch in one call', async () => {
    syncUnits.mockResolvedValue(result);
    await worker.handle([job('a'), job('b')]);
    expect(syncUnits).toHaveBeenCalledTimes(1);
    expect(syncUnits).toHaveBeenCalledWith(['a', 'b']);
    expect(fail).not.toHaveBeenCalled();
  });

  it('fails only the bad unit when a batch fails', async () => {
    syncUnits.mockImplementation(async (ids: string[]) => {
      if (ids.includes('bad')) throw new Error('rejected');
      return result;
    });
    await worker.handle([job('a'), job('bad'), job('c')]);
    expect(fail).toHaveBeenCalledTimes(1);
    expect(fail).toHaveBeenCalledWith('job-bad', expect.any(Error));
    expect(syncUnits).toHaveBeenCalledWith(['a']);
    expect(syncUnits).toHaveBeenCalledWith(['c']);
  });

  it('rethrows when a single job fails so pg-boss retries it', async () => {
    syncUnits.mockRejectedValue(new Error('down'));
    await expect(worker.handle([job('a')])).rejects.toThrow('down');
    expect(fail).not.toHaveBeenCalled();
  });
});
