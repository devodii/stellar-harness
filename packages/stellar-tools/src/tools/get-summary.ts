import { DEFAULT_NETWORK, emptySummary, type Network, type Snapshot } from '@harness/schema';
import { type NetworkSelection, resolveNetwork } from '../core/network';
import type { StorageContext } from './context';
import { defineNamedTool } from './define';

export const NOMINAL_LEDGER_CLOSE_SECONDS = 5;

export const placeholderSnapshot = (
  now: Date = new Date(),
  network: Network = DEFAULT_NETWORK,
): Snapshot => ({
  snapshotLedger: 1,
  snapshotTime: now.toISOString(),
  ledgerCloseSeconds: NOMINAL_LEDGER_CLOSE_SECONDS,
  gitSha: 'unknown',
  network,
});

export const getSummary = defineNamedTool(
  'getSummary',
  async (_input, ctx: StorageContext & NetworkSelection) => {
    const summary = await ctx.storage.getSummary();
    if (summary) return summary;
    return emptySummary(
      (await ctx.storage.getSnapshot()) ??
        placeholderSnapshot(new Date(), resolveNetwork(ctx).network),
    );
  },
);
