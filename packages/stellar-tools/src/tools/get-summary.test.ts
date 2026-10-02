import { emptySummary, Summary } from '@harness/schema';
import { MemoryStorage } from '@harness/storage';
import { describe, expect, it } from 'vitest';
import { invokeTool } from '../tool';
import { getSummary } from './get-summary';

describe('getSummary tool', () => {
  const snapshot = {
    snapshotLedger: 59_000_000,
    snapshotTime: '2026-10-02T00:00:00.000Z',
    ledgerCloseSeconds: 5.8,
    gitSha: 'abc',
    network: 'mainnet' as const,
  };

  it('returns the stored summary', async () => {
    const summary = { ...emptySummary(snapshot), findingsCount: { TX_BAD_SEQ_CLUSTER: 3 } };
    const result = await invokeTool(getSummary, {}, { storage: new MemoryStorage({ summary }) });
    expect(result.ok && result.data.findingsCount).toEqual({ TX_BAD_SEQ_CLUSTER: 3 });
  });

  it('returns an empty summary on a placeholder snapshot when nothing is stored', async () => {
    const result = await invokeTool(getSummary, {}, { storage: new MemoryStorage() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Summary.parse(result.data).failures.txFailed).toBe(0);
    expect(result.data.snapshot.gitSha).toBe('unknown');
  });

  it('stamps the placeholder snapshot with the selected network', async () => {
    const result = await invokeTool(
      getSummary,
      {},
      { storage: new MemoryStorage(), network: 'testnet' as const },
    );
    expect(result.ok && result.data.snapshot.network).toBe('testnet');
  });
});
