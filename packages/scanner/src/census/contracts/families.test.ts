import { ExpertContract } from '@harness/stellar-tools/contracts';
import { describe, expect, it } from 'vitest';
import page1 from './__fixtures__/expert-contracts-page-1.json';
import page2 from './__fixtures__/expert-contracts-page-2.json';
import { buildFamilies, toContractRows } from './families';
import { ContractRow } from './schemas';

const records = [...page1._embedded.records, ...page2._embedded.records].map((record) =>
  ExpertContract.parse(record),
);

describe('buildFamilies', () => {
  it('ranks wasm families by size, largest first, ties by hash', () => {
    const families = buildFamilies([
      { wasm: 'b'.repeat(64) },
      { wasm: 'a'.repeat(64) },
      { wasm: 'b'.repeat(64) },
      { wasm: 'c'.repeat(64) },
      {},
    ]);
    expect([...families.values()]).toEqual([
      { wasm: 'b'.repeat(64), size: 2, rank: 1 },
      { wasm: 'a'.repeat(64), size: 1, rank: 2 },
      { wasm: 'c'.repeat(64), size: 1, rank: 3 },
    ]);
  });
});

describe('toContractRows', () => {
  it('annotates real records with family size and rank', () => {
    const rows = toContractRows(records);
    expect(rows).toHaveLength(6);
    for (const row of rows) ContractRow.parse(row);
    const shared = rows.filter(
      (row) => row.wasm === '07097f83dae3b746db7dba3263d9cc334efb88a9a7d5450fb96ca19f33d284b0',
    );
    expect(shared.length).toBeGreaterThan(1);
    expect(shared.every((row) => row.familySize === shared.length && row.familyRank === 1)).toBe(
      true,
    );
  });
});
