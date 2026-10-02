import 'server-only';
import { emptySummary, type Snapshot } from '@harness/schema';
import { createStorage } from '@harness/storage';
import type { SummaryResponse } from './api-schemas';
import { getServerEnv } from './env';
import { memo } from './memo';
import { hasScanData } from './summary';

export const getStorage = memo(() => createStorage({ dataDir: getServerEnv().HARNESS_DATA_DIR }));

const NO_SCAN_SNAPSHOT = (): Snapshot => ({
  snapshotLedger: 1,
  snapshotTime: new Date().toISOString(),
  ledgerCloseSeconds: 5,
  gitSha: 'none',
  network: 'mainnet',
});

export const readSummary = async (): Promise<SummaryResponse> => {
  const summary = await getStorage().getSummary();
  if (!summary) return { summary: emptySummary(NO_SCAN_SNAPSHOT()), scanned: false };
  return { summary, scanned: hasScanData(summary) };
};
