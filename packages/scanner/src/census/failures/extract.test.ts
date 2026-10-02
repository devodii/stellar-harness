import { describe, expect, it } from 'vitest';
import samples from './__fixtures__/rpc-failed-transactions.json';
import { asRpcTransaction, recordedDecoders, syntheticTx } from './__tests__/fakes';
import { extractFailed, extractFailedTx } from './extract';
import { FailedTx } from './rows';

const decoders = recordedDecoders(samples);

describe('extractFailedTx', () => {
  it('builds a failed_tx row for every recorded live sample', () => {
    for (const sample of samples) {
      const row = extractFailedTx(asRpcTransaction(sample), decoders);
      if (!row.ok) throw new Error(row.error.message);
      expect(FailedTx.parse(row.value)).toEqual(row.value);
      expect(row.value).toMatchObject({
        hash: sample.txHash,
        ledger: sample.ledger,
        sourceAccount: sample.expected.envelope.sourceAccount,
        maxFee: sample.expected.envelope.maxFee,
        operationCount: sample.expected.envelope.operationCount,
        memoType: sample.expected.envelope.memoType,
        opTypes: sample.expected.envelope.opTypes,
        resultCodes: { tx: sample.expected.result.tx, ops: sample.expected.result.ops },
        feeBump: sample.expected.result.feeBump,
      });
    }
  });

  it('reads feeCharged from the result xdr itself, matching the sdk decoding', () => {
    for (const sample of samples) {
      const row = extractFailedTx(asRpcTransaction(sample), decoders);
      expect(row.ok && row.value.feeCharged).toBe(sample.expected.result.feeCharged);
    }
  });

  it('keeps no xdr bodies in the row', () => {
    const sample = samples[0];
    if (!sample) throw new Error('fixture is empty');
    const row = extractFailedTx(asRpcTransaction(sample), decoders);
    expect(JSON.stringify(row)).not.toContain(sample.envelopeXdr);
  });
});

describe('extractFailed', () => {
  it('skips successful transactions and collects decode errors', () => {
    const live = samples.slice(0, 2).map(asRpcTransaction);
    const success = syntheticTx(1, 1, 'SUCCESS');
    const broken = syntheticTx(1, 2, 'FAILED');
    const { rows, errors } = extractFailed([...live, success, broken], decoders);
    expect(rows).toHaveLength(2);
    expect(errors).toEqual([{ hash: '1-2', ledger: 1, message: expect.any(String) }]);
  });
});

it.todo('decodes the recorded live samples with the real stellar-tools decoder after core merge');
