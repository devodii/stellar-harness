import { describe, expect, it } from 'vitest';
import { contractsSummary, isMeaningfulRow, meaningfulCounts } from './summary';
import { contractRow, ttl } from './testing';

const scf = { slug: 'soroswap', name: 'Soroswap', round: 21 };
const wasmA = 'aa'.repeat(32);
const wasmB = 'bb'.repeat(32);

const rows = [
  contractRow(1, { wasm: wasmA, instance: ttl.archived() }),
  contractRow(2, { wasm: wasmA, instance: ttl.archived(), scf }),
  contractRow(3, { wasm: wasmB, instance: ttl.archived() }),
  contractRow(4, { wasm: null, asset: 'USDC-G...-1', instance: ttl.archived(), code: null }),
  contractRow(5, { wasm: wasmB, instance: ttl.live(12), scf }),
  contractRow(6, { wasm: wasmB, instance: ttl.live(45), invocations: 0 }),
  contractRow(7, { wasm: wasmB, instance: null }),
];
const projects = [{ ...scf, contracts: [rows[1]?.contract ?? '', rows[4]?.contract ?? ''] }];

describe('contractsSummary', () => {
  it('computes every count from derived rows', () => {
    expect(contractsSummary(rows, projects)).toEqual({
      total: 7,
      families: 2,
      archivedInstances: 4,
      archivedMeaningful: 1,
      archivedByFamily: { [wasmA]: 2, [wasmB]: 1, stellar_asset: 1 },
      expiring30d: 1,
      expiring30dMeaningful: 1,
      expiring90d: 1,
      liveIdle: 1,
      scfFunded: { total: 2, archived: 1, expiring30d: 1, projects },
    });
  });

  it('uses previous activity for idleness when given', () => {
    const previous = new Map([[rows[4]?.contract ?? '', 10]]);
    expect(contractsSummary(rows, [], previous).liveIdle).toBe(2);
  });

  it('counts archived and expiring instances that matter', () => {
    const busy = [
      contractRow(8, { instance: ttl.archived(), invocations: 100 }),
      contractRow(9, { instance: ttl.archived(), invocations: 99 }),
      contractRow(10, { instance: ttl.live(12), invocations: 5_000 }),
    ];
    expect(meaningfulCounts([...rows, ...busy])).toEqual({
      archivedMeaningful: 2,
      expiring30dMeaningful: 2,
    });
  });

  it('treats scf funded or 100+ invocation contracts as meaningful', () => {
    expect(isMeaningfulRow({ invocations: 100, scf: null })).toBe(true);
    expect(isMeaningfulRow({ invocations: 0, scf })).toBe(true);
    expect(isMeaningfulRow({ invocations: 99, scf: null })).toBe(false);
  });

  it('summarises an empty run', () => {
    expect(contractsSummary([], [])).toMatchObject({ total: 0, families: 0, archivedByFamily: {} });
  });
});
