import { appError, err } from '@harness/schema';
import type { RpcPort, RpcTransaction, Runner } from '../ports';

export const sequentialRunner: Runner = async (tasks, worker) => {
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

const unimplemented = async () => err(appError('INTERNAL', 'not implemented in fake'));

export const fakeRpc = (overrides: Partial<RpcPort>): RpcPort => ({
  getLatestLedger: unimplemented,
  getLedgerEntries: unimplemented,
  simulateTransaction: unimplemented,
  getTransactions: unimplemented,
  ...overrides,
});

type FixtureTransaction = Omit<RpcTransaction, 'status'> & { status: string };

export const asRpcTransaction = (tx: FixtureTransaction): RpcTransaction => ({
  txHash: tx.txHash,
  ledger: tx.ledger,
  status: tx.status === 'FAILED' ? 'FAILED' : 'SUCCESS',
  applicationOrder: tx.applicationOrder,
  feeBump: tx.feeBump,
  envelopeXdr: tx.envelopeXdr,
  resultXdr: tx.resultXdr,
  createdAt: tx.createdAt,
});
