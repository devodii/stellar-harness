import type { ExpertContract } from '@harness/stellar-tools/contracts';
import type { ContractRow } from './schemas';

export type Family = { wasm: string; size: number; rank: number };

export const buildFamilies = (records: Pick<ExpertContract, 'wasm'>[]): Map<string, Family> => {
  const sizes = new Map<string, number>();
  for (const { wasm } of records) {
    if (wasm) sizes.set(wasm, (sizes.get(wasm) ?? 0) + 1);
  }
  const ordered = [...sizes.entries()].sort(([a, x], [b, y]) => y - x || a.localeCompare(b));
  return new Map(ordered.map(([wasm, size], index) => [wasm, { wasm, size, rank: index + 1 }]));
};

export const toContractRows = (records: ExpertContract[]): ContractRow[] => {
  const families = buildFamilies(records);
  return records.map((record) => {
    const family = record.wasm ? families.get(record.wasm) : undefined;
    return {
      contract: record.contract,
      wasm: record.wasm ?? null,
      asset: record.asset ?? null,
      created: record.created,
      creator: record.creator ?? null,
      invocations: record.invocations,
      subinvocations: record.subinvocation,
      familySize: family?.size ?? null,
      familyRank: family?.rank ?? null,
      instance: null,
      code: null,
      scf: null,
    };
  });
};
