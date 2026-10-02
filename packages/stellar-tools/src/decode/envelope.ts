import {
  type Asset,
  FeeBumpTransaction,
  Networks,
  type OperationRecord,
  type Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import type { EnvelopeOperation } from '../tools/decoder-schemas';
import { camelToSnake } from './case';

export type TimeBounds = { minTime: number; maxTime: number };

export type EnvelopeSummary = {
  feeBump: boolean;
  source: string;
  feeSource: string;
  fee: string;
  innerFee: string | null;
  innerHash: string | null;
  seq: string;
  opTypes: string[];
  operations: EnvelopeOperation[];
  memoType: string;
  memo: string | null;
  timeBounds: TimeBounds | null;
};

const memoValue = (memo: Transaction['memo']): string | null => {
  const value = memo.value;
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return Buffer.from(value).toString(memo.type === 'text' ? 'utf8' : 'base64');
};

const timeBoundsOf = (tx: Transaction): TimeBounds | null => {
  const bounds = tx.timeBounds;
  return bounds ? { minTime: Number(bounds.minTime), maxTime: Number(bounds.maxTime) } : null;
};

export const assetName = (asset: Asset): string =>
  asset.isNative() ? 'XLM' : `${asset.getCode()}:${asset.getIssuer()}`;

type PaymentFields = Pick<EnvelopeOperation, 'destination' | 'asset' | 'amount'>;

const paymentFields = (operation: OperationRecord): PaymentFields => {
  switch (operation.type) {
    case 'payment':
      return {
        destination: operation.destination,
        asset: assetName(operation.asset),
        amount: operation.amount,
      };
    case 'pathPaymentStrictReceive':
      return {
        destination: operation.destination,
        asset: assetName(operation.destAsset),
        amount: operation.destAmount,
      };
    case 'pathPaymentStrictSend':
      return {
        destination: operation.destination,
        asset: assetName(operation.destAsset),
        amount: operation.destMin,
      };
    case 'createAccount':
      return {
        destination: operation.destination,
        asset: 'XLM',
        amount: operation.startingBalance,
      };
    case 'accountMerge':
      return { destination: operation.destination };
    default:
      return {};
  }
};

export const summarizeOperation = (
  type: string,
  operation: OperationRecord,
): EnvelopeOperation => ({
  type,
  ...(operation.source ? { source: operation.source } : {}),
  ...paymentFields(operation),
});

export const decodeEnvelopeSummary = (
  envelopeXdr: string,
  networkPassphrase: string = Networks.PUBLIC,
): EnvelopeSummary => {
  const parsed = TransactionBuilder.fromXdr(envelopeXdr, networkPassphrase);
  const feeBump = parsed instanceof FeeBumpTransaction;
  const tx = feeBump ? parsed.innerTransaction : parsed;
  const opTypes = tx.tx.operations.map((operation) => camelToSnake(operation.body.type));
  return {
    feeBump,
    source: tx.source,
    feeSource: feeBump ? parsed.feeSource : tx.source,
    fee: parsed.fee,
    innerFee: feeBump ? tx.fee : null,
    innerHash: feeBump ? Buffer.from(tx.hash()).toString('hex') : null,
    seq: tx.sequence,
    opTypes,
    operations: tx.operations.map((operation, index) =>
      summarizeOperation(opTypes[index] ?? camelToSnake(operation.type), operation),
    ),
    memoType: tx.memo.type,
    memo: memoValue(tx.memo),
    timeBounds: timeBoundsOf(tx),
  };
};
