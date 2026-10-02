import { appError, err, ok, type Result } from '@harness/schema';
import { xdr } from '@stellar/stellar-sdk';
import { z } from 'zod';
import type { Http, HttpResponse, RequestOptions } from './http';

export const LEDGER_ENTRIES_BATCH = 200;
export const TRANSACTIONS_PAGE_LIMIT = 200;

const RpcErrorBody = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional(),
});

const RpcEnvelope = z.object({
  result: z.unknown().optional(),
  error: RpcErrorBody.optional(),
});

const timestamp = z.coerce.number().int();

export const RpcHealth = z.object({
  status: z.string(),
  latestLedger: z.number().int(),
  oldestLedger: z.number().int(),
  ledgerRetentionWindow: z.number().int(),
  latestLedgerCloseTime: timestamp.optional(),
  oldestLedgerCloseTime: timestamp.optional(),
});
export type RpcHealth = z.infer<typeof RpcHealth>;

export const RpcLatestLedger = z.object({
  id: z.string(),
  protocolVersion: z.number().int(),
  sequence: z.number().int(),
  closeTime: timestamp.optional(),
});
export type RpcLatestLedger = z.infer<typeof RpcLatestLedger>;

export const RpcNetwork = z.object({
  passphrase: z.string(),
  protocolVersion: z.number().int(),
  friendbotUrl: z.string().optional(),
});
export type RpcNetwork = z.infer<typeof RpcNetwork>;

export const RpcLedgerEntry = z.object({
  key: z.string(),
  xdr: z.string(),
  lastModifiedLedgerSeq: z.number().int(),
  liveUntilLedgerSeq: z.number().int().optional(),
  extXdr: z.string().optional(),
});
export type RpcLedgerEntry = z.infer<typeof RpcLedgerEntry>;

export const RpcLedgerEntries = z.object({
  entries: z
    .array(RpcLedgerEntry)
    .nullish()
    .transform((entries) => entries ?? []),
  latestLedger: z.number().int(),
});

export const RpcTransaction = z.object({
  status: z.enum(['SUCCESS', 'FAILED']),
  txHash: z.string(),
  applicationOrder: z.number().int(),
  feeBump: z.boolean(),
  envelopeXdr: z.string(),
  resultXdr: z.string(),
  ledger: z.number().int(),
  createdAt: timestamp,
});
export type RpcTransaction = z.infer<typeof RpcTransaction>;

export const RpcTransactionsPage = z.object({
  transactions: z
    .array(RpcTransaction)
    .nullish()
    .transform((transactions) => transactions ?? []),
  latestLedger: z.number().int(),
  latestLedgerCloseTimestamp: timestamp,
  oldestLedger: z.number().int(),
  oldestLedgerCloseTimestamp: timestamp,
  cursor: z.string(),
});
export type RpcTransactionsPage = z.infer<typeof RpcTransactionsPage>;

export const RpcGetTransaction = z.union([
  z.object({ status: z.literal('NOT_FOUND'), latestLedger: z.number().int() }),
  RpcTransaction.extend({ latestLedger: z.number().int() }),
]);

export const RpcSimulation = z.object({
  latestLedger: z.number().int(),
  minResourceFee: z.string().optional(),
  transactionData: z.string().optional(),
  error: z.string().optional(),
  results: z.array(z.object({ xdr: z.string(), auth: z.array(z.string()).nullish() })).nullish(),
  cost: z.object({ cpuInsns: z.string(), memBytes: z.string() }).optional(),
  restorePreamble: z.object({ minResourceFee: z.string(), transactionData: z.string() }).optional(),
  events: z.array(z.string()).nullish(),
  stateChanges: z.array(z.unknown()).nullish(),
});
export type RpcSimulation = z.infer<typeof RpcSimulation>;

export type LedgerEntryResult = {
  key: string;
  data: xdr.LedgerEntryData;
  lastModifiedLedgerSeq: number;
  liveUntilLedgerSeq: number | null;
};

export type LedgerEntriesResult = { latestLedger: number; entries: LedgerEntryResult[] };

export type GetTransactionsParams =
  | { startLedger: number; cursor?: undefined; limit?: number }
  | { cursor: string; startLedger?: undefined; limit?: number };

export type TransactionRangeParams = { startLedger: number; endLedger: number; limit?: number };

export type RpcClient = {
  readonly url: string;
  call<S extends z.ZodType>(
    method: string,
    params: unknown,
    schema: S,
    opts?: RequestOptions,
  ): Promise<Result<z.infer<S>>>;
  getHealth(): Promise<Result<RpcHealth>>;
  getLatestLedger(): Promise<Result<RpcLatestLedger>>;
  getNetwork(): Promise<Result<RpcNetwork>>;
  getLedgerEntries(
    keys: ReadonlyArray<xdr.LedgerKey | string>,
    opts?: RequestOptions,
  ): Promise<Result<LedgerEntriesResult>>;
  getTransactions(
    params: GetTransactionsParams,
    opts?: RequestOptions,
  ): Promise<Result<RpcTransactionsPage>>;
  iterateTransactions(
    params: TransactionRangeParams,
    opts?: RequestOptions,
  ): AsyncGenerator<Result<RpcTransactionsPage>>;
  getTransaction(hash: string, opts?: RequestOptions): Promise<Result<RpcTransaction | null>>;
  simulateTransaction(txXdr: string, opts?: RequestOptions): Promise<Result<RpcSimulation>>;
};

const HEAVY_TX_FIELDS = ['resultMetaXdr', 'diagnosticEventsXdr', 'events'];

const omitHeavy = (value: unknown): unknown => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !HEAVY_TX_FIELDS.includes(key)),
  );
};

export const stripTransactionMeta = (body: string): string => {
  try {
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object' || !('result' in parsed)) return body;
    const result = parsed.result;
    if (!result || typeof result !== 'object') return body;
    const trimmed =
      'transactions' in result && Array.isArray(result.transactions)
        ? { ...result, transactions: result.transactions.map(omitHeavy) }
        : omitHeavy(result);
    return JSON.stringify({ ...parsed, result: trimmed });
  } catch {
    return body;
  }
};

const resultOf = (response: HttpResponse): Record<string, unknown> | null => {
  try {
    const parsed = RpcEnvelope.safeParse(JSON.parse(response.body));
    if (!parsed.success || parsed.data.error) return null;
    const result = parsed.data.result;
    return result && typeof result === 'object' ? (result as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const isRpcSuccess = (response: HttpResponse): boolean => resultOf(response) !== null;

const keyToBase64 = (key: xdr.LedgerKey | string): string =>
  typeof key === 'string' ? key : key.toXdr('base64');

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

export const decodeLedgerEntry = (entry: RpcLedgerEntry): LedgerEntryResult => ({
  key: entry.key,
  data: xdr.LedgerEntryData.fromXdr(entry.xdr, 'base64'),
  lastModifiedLedgerSeq: entry.lastModifiedLedgerSeq,
  liveUntilLedgerSeq: entry.liveUntilLedgerSeq ?? null,
});

export const createRpcClient = ({ http, url }: { http: Http; url: string }): RpcClient => {
  const call: RpcClient['call'] = async (method, params, schema, opts = {}) => {
    // A constant id keeps identical calls byte-identical so the disk cache can key on the body.
    const body = { jsonrpc: '2.0', id: 1, method, ...(params === undefined ? {} : { params }) };
    const envelope = await http.postJson(url, body, RpcEnvelope, {
      ...opts,
      cacheable: (response) => isRpcSuccess(response) && (opts.cacheable?.(response) ?? true),
    });
    if (!envelope.ok) return envelope;
    const { error, result } = envelope.value;
    if (error) {
      return err(
        appError('UPSTREAM_FAILED', `RPC ${method} failed: ${error.message}`, {
          kind: 'rpc',
          rpcCode: error.code,
          method,
        }),
      );
    }
    const parsed = schema.safeParse(result);
    if (parsed.success) return ok(parsed.data);
    const issue = parsed.error.issues[0];
    return err(
      appError('UPSTREAM_FAILED', `Unexpected RPC ${method} result at ${issue?.path.join('.')}`, {
        kind: 'schema',
        method,
      }),
    );
  };

  const getLedgerEntries: RpcClient['getLedgerEntries'] = async (keys, opts) => {
    const batches = chunk(keys.map(keyToBase64), LEDGER_ENTRIES_BATCH);
    const results = await Promise.all(
      batches.map((batch) => call('getLedgerEntries', { keys: batch }, RpcLedgerEntries, opts)),
    );
    const entries: LedgerEntryResult[] = [];
    let latestLedger = 0;
    for (const result of results) {
      if (!result.ok) return result;
      latestLedger = Math.max(latestLedger, result.value.latestLedger);
      try {
        entries.push(...result.value.entries.map(decodeLedgerEntry));
      } catch (error) {
        return err(
          appError('UPSTREAM_FAILED', `Undecodable ledger entry: ${String(error)}`, {
            kind: 'parse',
          }),
        );
      }
    }
    return ok({ latestLedger, entries });
  };

  const getTransactions: RpcClient['getTransactions'] = (params, opts = {}) => {
    const limit = params.limit ?? TRANSACTIONS_PAGE_LIMIT;
    const request =
      params.cursor === undefined
        ? { startLedger: params.startLedger, pagination: { limit } }
        : { pagination: { cursor: params.cursor, limit } };
    return call('getTransactions', { ...request, xdrFormat: 'base64' }, RpcTransactionsPage, {
      transformBody: stripTransactionMeta,
      cacheable: (response) => {
        const transactions = resultOf(response)?.transactions;
        return Array.isArray(transactions) && transactions.length >= limit;
      },
      ...opts,
    });
  };

  async function* iterateTransactions(
    { startLedger, endLedger, limit = TRANSACTIONS_PAGE_LIMIT }: TransactionRangeParams,
    opts?: RequestOptions,
  ): AsyncGenerator<Result<RpcTransactionsPage>> {
    let cursor: string | undefined;
    while (true) {
      const page = await getTransactions(
        cursor === undefined ? { startLedger, limit } : { cursor, limit },
        opts,
      );
      if (!page.ok) {
        yield page;
        return;
      }
      const { transactions } = page.value;
      yield ok({
        ...page.value,
        transactions: transactions.filter((tx) => tx.ledger <= endLedger),
      });
      const last = transactions.at(-1);
      if (!last || last.ledger > endLedger || transactions.length < limit) return;
      if (page.value.cursor === cursor) return;
      cursor = page.value.cursor;
    }
  }

  const getTransaction: RpcClient['getTransaction'] = async (hash, opts = {}) => {
    const result = await call('getTransaction', { hash, xdrFormat: 'base64' }, RpcGetTransaction, {
      transformBody: stripTransactionMeta,
      cacheable: (response) => resultOf(response)?.status !== 'NOT_FOUND',
      ...opts,
    });
    if (!result.ok) return result;
    if (result.value.status === 'NOT_FOUND') return ok(null);
    return ok(RpcTransaction.parse(result.value));
  };

  return {
    url,
    call,
    getHealth: () => call('getHealth', undefined, RpcHealth, { cache: false }),
    getLatestLedger: () => call('getLatestLedger', undefined, RpcLatestLedger, { cache: false }),
    getNetwork: () => call('getNetwork', undefined, RpcNetwork),
    getLedgerEntries,
    getTransactions,
    iterateTransactions,
    getTransaction,
    simulateTransaction: (txXdr, opts) =>
      call('simulateTransaction', { transaction: txXdr }, RpcSimulation, opts),
  };
};
