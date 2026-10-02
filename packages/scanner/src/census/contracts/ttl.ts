import {
  classifyTtl,
  codeKeyXdr,
  instanceKeyXdr,
  type TtlClock,
} from '../../stellar/contracts';
import type { LedgerEntryResult, RpcPort, Run } from './ports';
import type { ContractRow } from './schemas';

export const LEDGER_KEYS_PER_CALL = 200;
export const RPC_CONCURRENCY = 8;

export type TtlDeps = { rpc: RpcPort; run: Run; concurrency?: number };

export type TtlStats = {
  keysRequested: number;
  batches: number;
  failedBatches: number;
  entriesFound: number;
};

export const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export const collectTtl = async (
  deps: TtlDeps,
  rows: ContractRow[],
  clock: TtlClock,
): Promise<{ rows: ContractRow[]; stats: TtlStats }> => {
  const instanceKeys = new Map(rows.map((row) => [row.contract, instanceKeyXdr(row.contract)]));
  const wasms = [...new Set(rows.flatMap((row) => (row.wasm ? [row.wasm] : [])))];
  const codeKeys = new Map(wasms.map((wasm) => [wasm, codeKeyXdr(wasm)]));
  const batches = chunk([...instanceKeys.values(), ...codeKeys.values()], LEDGER_KEYS_PER_CALL);

  const outcome = await deps.run(
    batches,
    async (keys) => {
      const response = await deps.rpc.getLedgerEntries(keys);
      if (!response.ok) throw response.error;
      return response.value.entries;
    },
    { concurrency: deps.concurrency ?? RPC_CONCURRENCY, label: 'contracts:ttl' },
  );

  const entries = new Map<string, LedgerEntryResult>();
  for (const entry of outcome.results.flat()) entries.set(entry.key, entry);
  const unknown = new Set(outcome.failures.flatMap((failure) => failure.task));

  const statusFor = (key: string | undefined) =>
    key === undefined || unknown.has(key) ? null : classifyTtl(entries.get(key), clock);

  return {
    rows: rows.map((row) => ({
      ...row,
      instance: statusFor(instanceKeys.get(row.contract)),
      code: row.wasm ? statusFor(codeKeys.get(row.wasm)) : null,
    })),
    stats: {
      keysRequested: instanceKeys.size + codeKeys.size,
      batches: batches.length,
      failedBatches: outcome.failures.length,
      entriesFound: entries.size,
    },
  };
};
