import type { FailedTx } from '../rows';

let counter = 0;

export const failedRow = (overrides: Partial<FailedTx> & { codes?: string[] } = {}): FailedTx => {
  counter += 1;
  const { codes, ...rest } = overrides;
  const [tx = 'tx_failed', ...ops] = codes ?? ['tx_failed', 'op_underfunded'];
  return {
    hash: `hash-${counter}`,
    ledger: 100,
    sourceAccount: 'GSOURCE',
    feeCharged: '100',
    maxFee: '100',
    operationCount: Math.max(1, ops.length),
    resultCodes: { tx, ops },
    feeBump: false,
    memoType: 'none',
    opTypes: ops.length > 0 ? ops.map(() => 'payment') : ['payment'],
    ...rest,
  };
};
