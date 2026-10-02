import {
  FeeBumpTransaction,
  Networks,
  type Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { camelToSnake } from './case';

export type TimeBounds = { minTime: number; maxTime: number };

export type EnvelopeSummary = {
  feeBump: boolean;
  source: string;
  feeSource: string;
  fee: string;
  innerFee: string | null;
  seq: string;
  opTypes: string[];
  memoType: string;
  memo: string | null;
  timeBounds: TimeBounds | null;
};

const memoValue = (memo: Transaction['memo']): string | null => {
  const value = memo.value;
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return Buffer.from(value).toString('base64');
};

const timeBoundsOf = (tx: Transaction): TimeBounds | null => {
  const bounds = tx.timeBounds;
  return bounds ? { minTime: Number(bounds.minTime), maxTime: Number(bounds.maxTime) } : null;
};

export const decodeEnvelopeSummary = (
  envelopeXdr: string,
  networkPassphrase: string = Networks.PUBLIC,
): EnvelopeSummary => {
  const parsed = TransactionBuilder.fromXdr(envelopeXdr, networkPassphrase);
  const feeBump = parsed instanceof FeeBumpTransaction;
  const tx = feeBump ? parsed.innerTransaction : parsed;
  return {
    feeBump,
    source: tx.source,
    feeSource: feeBump ? parsed.feeSource : tx.source,
    fee: parsed.fee,
    innerFee: feeBump ? tx.fee : null,
    seq: tx.sequence,
    opTypes: tx.tx.operations.map((operation) => camelToSnake(operation.body.type)),
    memoType: tx.memo.type,
    memo: memoValue(tx.memo),
    timeBounds: timeBoundsOf(tx),
  };
};
