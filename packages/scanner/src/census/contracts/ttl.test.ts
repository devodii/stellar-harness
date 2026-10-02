import { codeKeyXdr, ExpertContract } from '@harness/stellar-tools/contracts';
import { fakeRpc, syntheticContractId } from '@harness/stellar-tools/contracts/testing';
import { describe, expect, it } from 'vitest';
import { appError, err } from '../../schema';
import page1 from './__fixtures__/expert-contracts-page-1.json';
import page2 from './__fixtures__/expert-contracts-page-2.json';
import batch from './__fixtures__/rpc-instance-entries.json';
import { toContractRows } from './families';
import { sequentialRun } from './testing';
import { chunk, collectTtl } from './ttl';

const rows = toContractRows(
  [...page1._embedded.records, ...page2._embedded.records].map((record) =>
    ExpertContract.parse(record),
  ),
);
const clock = { snapshotLedger: batch.latestLedger, ledgerCloseSeconds: 5 };
const codeEntry = (wasm: string, liveUntilLedgerSeq: number) => ({
  key: codeKeyXdr(wasm),
  xdr: '',
  liveUntilLedgerSeq,
});

describe('chunk', () => {
  it('splits into fixed size batches', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe('collectTtl', () => {
  it('joins instance and code entries onto every contract', async () => {
    const wasms = [...new Set(rows.flatMap((row) => (row.wasm ? [row.wasm] : [])))];
    const entries = [
      ...batch.entries.map((item) => item.entry),
      ...wasms.map((wasm) => codeEntry(wasm, batch.latestLedger + 1000)),
    ];
    const rpc = fakeRpc({ entries, latestLedger: batch.latestLedger });
    const result = await collectTtl({ rpc, run: sequentialRun }, rows, clock);
    expect(result.stats).toMatchObject({
      keysRequested: rows.length + wasms.length,
      batches: 1,
      failedBatches: 0,
    });
    const byContract = new Map(result.rows.map((row) => [row.contract, row]));
    for (const { contract, entry } of batch.entries) {
      const row = byContract.get(contract);
      expect(row?.instance?.present).toBe(true);
      expect(row?.instance?.archived).toBe(entry.liveUntilLedgerSeq < batch.latestLedger);
      expect(row?.code).toMatchObject({ archived: false, ledgersLeft: 1000 });
    }
    expect(result.rows.filter((row) => row.instance?.archived).length).toBeGreaterThan(0);
  });

  it('marks contracts in a failed batch as unknown instead of archived', async () => {
    const rpc = {
      ...fakeRpc(),
      getLedgerEntries: async () => err(appError('UPSTREAM_TIMEOUT', 'timeout')),
    };
    const result = await collectTtl({ rpc, run: sequentialRun }, rows, clock);
    expect(result.stats.failedBatches).toBe(1);
    expect(result.rows.every((row) => row.instance === null && row.code === null)).toBe(true);
  });

  it('batches at most 200 keys per call', async () => {
    const template = rows[0] as (typeof rows)[number];
    const many = Array.from({ length: 450 }, (_, index) => ({
      ...template,
      contract: syntheticContractId(index),
    }));
    const rpc = fakeRpc();
    const result = await collectTtl({ rpc, run: sequentialRun }, many, clock);
    expect(rpc.calls.getLedgerEntries.map((keys) => keys.length)).toEqual([200, 200, 51]);
    expect(result.stats).toMatchObject({ keysRequested: 451, batches: 3 });
  });
});
