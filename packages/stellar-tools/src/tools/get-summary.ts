import { emptySummary, type Snapshot } from '@harness/schema';
import type { StorageContext } from './context';
import { defineNamedTool } from './define';

export const NOMINAL_LEDGER_CLOSE_SECONDS = 5;

export const placeholderSnapshot = (now: Date = new Date()): Snapshot => ({
  snapshotLedger: 1,
  snapshotTime: now.toISOString(),
  ledgerCloseSeconds: NOMINAL_LEDGER_CLOSE_SECONDS,
  gitSha: 'unknown',
  network: 'mainnet',
});

export const getSummary = defineNamedTool('getSummary', async (_input, ctx: StorageContext) => {
  const summary = await ctx.storage.getSummary();
  if (summary) return summary;
  return emptySummary((await ctx.storage.getSnapshot()) ?? placeholderSnapshot());
});
