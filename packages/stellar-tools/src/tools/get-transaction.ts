import { type AppError, appError, err, ok, type Result } from '@harness/schema';
import { z } from 'zod';
import { defineTool, fail } from '../tool';
import type { EnvelopeTimeBounds } from './decoder-schemas';
import { GetTransactionInput, GetTransactionOutput, MemoType } from './failures-schemas';
import type { TransactionToolContext } from './network-context';
import { readFeeCharged } from './result-fee';

export type RawTransaction = {
  origin: 'rpc' | 'horizon';
  hash: string;
  successful: boolean;
  ledger: number;
  createdAtSeconds: number;
  envelopeXdr: string;
  resultXdr: string;
};

const RpcGetTransactionResponse = z.object({
  result: z
    .object({
      status: z.enum(['SUCCESS', 'FAILED', 'NOT_FOUND']),
      ledger: z.number().optional(),
      createdAt: z.union([z.string(), z.number()]).optional(),
      envelopeXdr: z.string().optional(),
      resultXdr: z.string().optional(),
    })
    .optional(),
  error: z.object({ message: z.string() }).optional(),
});

const HorizonTransaction = z.object({
  hash: z.string(),
  successful: z.boolean(),
  ledger: z.number(),
  created_at: z.string(),
  envelope_xdr: z.string(),
  result_xdr: z.string(),
});

const parseJson = (body: string): unknown => {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
};

export const fetchFromRpc = async (
  ctx: TransactionToolContext,
  hash: string,
): Promise<Result<RawTransaction | null>> => {
  const response = await ctx.fetch(ctx.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTransaction', params: { hash } }),
  });
  if (!response.ok) return response;
  const parsed = RpcGetTransactionResponse.safeParse(parseJson(response.value.body));
  if (!parsed.success || !parsed.data.result) {
    const reason = parsed.success ? parsed.data.error?.message : 'unreadable RPC response';
    return err(appError('UPSTREAM_FAILED', `RPC getTransaction failed: ${reason ?? 'no result'}`));
  }
  const tx = parsed.data.result;
  if (tx.status === 'NOT_FOUND') return ok(null);
  if (!tx.envelopeXdr || !tx.resultXdr || tx.ledger === undefined || tx.createdAt === undefined) {
    return err(appError('UPSTREAM_FAILED', 'RPC getTransaction response is missing fields'));
  }
  return ok({
    origin: 'rpc',
    hash,
    successful: tx.status === 'SUCCESS',
    ledger: tx.ledger,
    createdAtSeconds: Number(tx.createdAt),
    envelopeXdr: tx.envelopeXdr,
    resultXdr: tx.resultXdr,
  });
};

export const fetchFromHorizon = async (
  ctx: TransactionToolContext,
  hash: string,
): Promise<Result<RawTransaction | null>> => {
  const response = await ctx.fetch(`${ctx.horizonUrl.replace(/\/$/, '')}/transactions/${hash}`);
  if (!response.ok) return response;
  if (response.value.status === 404) return ok(null);
  const parsed = HorizonTransaction.safeParse(parseJson(response.value.body));
  if (response.value.status !== 200 || !parsed.success) {
    return err(
      appError('UPSTREAM_FAILED', `Horizon transaction lookup returned ${response.value.status}`),
    );
  }
  const tx = parsed.data;
  return ok({
    origin: 'horizon',
    hash,
    successful: tx.successful,
    ledger: tx.ledger,
    createdAtSeconds: Math.floor(Date.parse(tx.created_at) / 1000),
    envelopeXdr: tx.envelope_xdr,
    resultXdr: tx.result_xdr,
  });
};

export const findTransaction = async (
  ctx: TransactionToolContext,
  hash: string,
): Promise<Result<RawTransaction>> => {
  const fromRpc = await fetchFromRpc(ctx, hash);
  if (fromRpc.ok && fromRpc.value) return ok(fromRpc.value);
  const fromHorizon = await fetchFromHorizon(ctx, hash);
  if (!fromHorizon.ok) return fromHorizon;
  if (fromHorizon.value) return ok(fromHorizon.value);
  const rpcNote = fromRpc.ok ? 'not in RPC retention' : `RPC error: ${fromRpc.error.message}`;
  return err(appError('NOT_FOUND', `Transaction ${hash} not found (${rpcNote}; not on Horizon)`));
};

const isoFromSeconds = (seconds: string | number): string | null => {
  const value = Number(seconds);
  return value > 0 ? new Date(value * 1000).toISOString() : null;
};

export const toTimebounds = (bounds: EnvelopeTimeBounds | undefined) =>
  bounds
    ? { minTime: isoFromSeconds(bounds.minTime), maxTime: isoFromSeconds(bounds.maxTime) }
    : null;

export const toTransactionOutput = (
  raw: RawTransaction,
  ctx: Pick<TransactionToolContext, 'decodeResultCodes' | 'decodeEnvelopeSummary'>,
): GetTransactionOutput => {
  const codes = ctx.decodeResultCodes(raw.resultXdr);
  const envelope = ctx.decodeEnvelopeSummary(raw.envelopeXdr);
  const memoType = MemoType.safeParse(envelope.memoType);
  const operations =
    envelope.operations?.map(({ type, source }) => (source ? { type, source } : { type })) ??
    envelope.opTypes.map((type) => ({ type }));
  return {
    hash: raw.hash,
    ledger: raw.ledger,
    createdAt: new Date(raw.createdAtSeconds * 1000).toISOString(),
    successful: raw.successful,
    source: envelope.sourceAccount,
    feeCharged: Number(readFeeCharged(raw.resultXdr)),
    maxFee: Number(envelope.maxFee),
    operationCount: envelope.operationCount,
    operations,
    memoType: memoType.success ? memoType.data : 'none',
    timebounds: toTimebounds(envelope.timeBounds),
    resultCodes: { tx: codes.tx, ops: codes.ops },
    feeBump:
      envelope.feeBump && envelope.feeSource && envelope.innerHash
        ? { feeSource: envelope.feeSource, innerHash: envelope.innerHash }
        : null,
  };
};

const toolError = (error: AppError): never => fail(error.code, error.message, error.meta);

export const getTransaction = defineTool({
  name: 'getTransaction',
  description:
    'Look up a mainnet transaction by hash (Soroban RPC within its retention window, Horizon otherwise) and return its envelope summary, success flag, decoded result codes, operations, fees, ledger and timebounds.',
  input: GetTransactionInput,
  output: GetTransactionOutput,
  run: async ({ hash }, ctx: TransactionToolContext) => {
    const raw = await findTransaction(ctx, hash.toLowerCase());
    if (!raw.ok) return toolError(raw.error);
    try {
      return toTransactionOutput(raw.value, ctx);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return fail('UPSTREAM_FAILED', `Could not decode transaction ${hash}: ${message}`);
    }
  },
});
