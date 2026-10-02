import { appError, err, ok, type Result } from '@harness/schema';
import { readFeeCharged } from '@harness/stellar-tools';
import type { DecodeEnvelopeSummary, DecodeResultCodes, RpcTransaction } from './ports';
import type { FailedTx } from './rows';

export type Decoders = {
  decodeResultCodes: DecodeResultCodes;
  decodeEnvelopeSummary: DecodeEnvelopeSummary;
};

export type ExtractError = { hash: string; ledger: number; message: string };

export const extractFailedTx = (tx: RpcTransaction, decoders: Decoders): Result<FailedTx> => {
  try {
    const codes = decoders.decodeResultCodes(tx.resultXdr);
    const envelope = decoders.decodeEnvelopeSummary(tx.envelopeXdr);
    return ok({
      hash: tx.txHash,
      ledger: tx.ledger,
      sourceAccount: envelope.sourceAccount,
      feeCharged: readFeeCharged(tx.resultXdr),
      maxFee: envelope.maxFee,
      operationCount: envelope.operationCount,
      resultCodes: { tx: codes.tx, ops: codes.ops },
      feeBump: codes.feeBump || envelope.feeBump || tx.feeBump,
      memoType: envelope.memoType,
      opTypes: envelope.opTypes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err(appError('UPSTREAM_FAILED', message, { hash: tx.txHash, ledger: tx.ledger }));
  }
};

export const extractFailed = (
  transactions: RpcTransaction[],
  decoders: Decoders,
): { rows: FailedTx[]; errors: ExtractError[] } => {
  const rows: FailedTx[] = [];
  const errors: ExtractError[] = [];
  for (const tx of transactions) {
    if (tx.status !== 'FAILED') continue;
    const row = extractFailedTx(tx, decoders);
    if (row.ok) rows.push(row.value);
    else errors.push({ hash: tx.txHash, ledger: tx.ledger, message: row.error.message });
  }
  return { rows, errors };
};
