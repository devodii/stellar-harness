import type { TtlStatus } from '@harness/stellar-tools/contracts';
import { syntheticContractId } from '@harness/stellar-tools/contracts/testing';
import type { Checkpoint, Emit, FindingDraft, Run, WriteDerived } from './ports';
import type { ContractRow } from './schemas';

export const sequentialRun: Run = async (tasks, worker) => {
  const results = [];
  const failures = [];
  for (const task of tasks) {
    try {
      results.push(await worker(task));
    } catch (error) {
      failures.push({ task, error });
    }
  }
  return { results, failures };
};

export const memorySinks = () => {
  const findings: FindingDraft[] = [];
  const derived: Record<string, unknown[]> = {};
  const checkpoints: Record<string, unknown>[] = [];
  const emit: Emit = (draft) => {
    findings.push(draft);
  };
  const writeDerived: WriteDerived = (name, rows) => {
    derived[name] = [...(derived[name] ?? []), ...rows];
  };
  const checkpoint: Checkpoint = (state) => {
    checkpoints.push(state);
  };
  return { findings, derived, checkpoints, emit, writeDerived, checkpoint };
};

const LEDGERS_PER_DAY = 17_280;

const live = (daysLeft: number): TtlStatus => ({
  present: true,
  liveUntilLedgerSeq: 1_000 + daysLeft * LEDGERS_PER_DAY,
  ledgersLeft: daysLeft * LEDGERS_PER_DAY,
  daysLeft,
  archived: false,
  expiring30d: daysLeft <= 30,
  expiring90d: daysLeft > 30 && daysLeft <= 90,
});

const archived = (): TtlStatus => ({
  present: true,
  liveUntilLedgerSeq: 0,
  ledgersLeft: 0,
  daysLeft: 0,
  archived: true,
  expiring30d: false,
  expiring90d: false,
});

export const ttl = { live, archived };

export const contractRow = (seed: number, overrides: Partial<ContractRow> = {}): ContractRow => ({
  contract: syntheticContractId(seed),
  wasm: 'ab'.repeat(32),
  asset: null,
  created: 1_700_000_000,
  creator: null,
  invocations: 10,
  subinvocations: 0,
  familySize: 1,
  familyRank: 1,
  instance: live(200),
  code: live(200),
  scf: null,
  ...overrides,
});
