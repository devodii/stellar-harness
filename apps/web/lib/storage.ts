import 'server-only';
import { emptySummary, type Network, type Snapshot } from '@harness/schema';
import { createStorage } from '@harness/storage';
import type { SummaryResponse } from './api-schemas';
import { getServerEnv } from './env';
import { memoBy } from './memo';
import { scopeStorageToNetwork } from './scoped-storage';
import { hasScanData } from './summary';

export const storageOptionsFor = (network: Network) => {
  const env = getServerEnv();
  return { dataDir: env.HARNESS_DATA_DIR, network, databaseUrl: env.DATABASE_URL };
};

export const getStorage = memoBy((network: Network) =>
  scopeStorageToNetwork(createStorage(storageOptionsFor(network)), network),
);

const noScanSnapshot = (network: Network): Snapshot => ({
  snapshotLedger: 1,
  snapshotTime: new Date().toISOString(),
  ledgerCloseSeconds: 5,
  gitSha: 'none',
  network,
});

export const readSummary = async (network: Network): Promise<SummaryResponse> => {
  const summary = await getStorage(network).getSummary();
  if (!summary) return { summary: emptySummary(noScanSnapshot(network)), scanned: false };
  return { summary, scanned: hasScanData(summary) };
};
