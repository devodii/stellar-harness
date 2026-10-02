import type { Snapshot } from '@harness/schema';
import type { FailuresCensusDeps } from '../census';
import type { Decoders } from '../extract';
import type { FindingDraft, HorizonPort, RpcPort, RpcTransaction } from '../ports';
import type { FailuresCheckpoint } from '../progress';
import { sequentialRunner } from './fakes';

export const FEE_PREFIX = 'AAAAAAAAAGQA';

export const encodedTx = (
  ledger: number,
  order: number,
  failure?: { account: string; codes: string[]; opType?: string },
): RpcTransaction => ({
  txHash: `${ledger}-${order}`,
  ledger,
  status: failure ? 'FAILED' : 'SUCCESS',
  applicationOrder: order,
  feeBump: false,
  envelopeXdr: `env|${failure?.account ?? 'GOK'}|${failure?.opType ?? 'payment'}`,
  resultXdr: `${FEE_PREFIX}|${(failure?.codes ?? ['tx_success']).join(',')}`,
  createdAt: ledger * 5,
});

export const encodedDecoders: Decoders = {
  decodeResultCodes: (xdr) => {
    const [prefix, codes = ''] = xdr.split('|');
    if (prefix !== FEE_PREFIX) throw new Error('bad xdr');
    const [tx = 'tx_failed', ...ops] = codes.split(',');
    return { tx, ops, feeBump: false };
  },
  decodeEnvelopeSummary: (xdr) => {
    const [, account = '', opType = 'payment'] = xdr.split('|');
    return {
      sourceAccount: account,
      maxFee: '100',
      operationCount: 1,
      memoType: 'none',
      opTypes: [opType],
      feeBump: false,
    };
  },
};

export const censusSnapshot: Snapshot = {
  snapshotLedger: 1000,
  snapshotTime: '2026-10-02T00:00:00.000Z',
  ledgerCloseSeconds: 5,
  gitSha: 'test',
  network: 'mainnet',
};

export const recordingDeps = (rpc: RpcPort, horizon: HorizonPort) => {
  const derived = new Map<string, unknown[]>();
  const emitted: FindingDraft[] = [];
  const checkpoints: FailuresCheckpoint[] = [];
  const deps: FailuresCensusDeps = {
    ...encodedDecoders,
    rpc,
    horizon,
    run: sequentialRunner,
    emit: (draft) => {
      emitted.push(draft);
    },
    writeDerived: async (name, rows) => {
      derived.set(name, [...(derived.get(name) ?? []), ...rows]);
    },
    resetDerived: async (name) => {
      derived.set(name, []);
    },
    readDerived: (name) => derived.get(name) ?? [],
    checkpoint: async (state) => {
      checkpoints.push(state);
    },
  };
  return { deps, derived, emitted, checkpoints };
};
