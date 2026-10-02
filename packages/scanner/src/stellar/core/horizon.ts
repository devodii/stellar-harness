import { z } from 'zod';
import { appError, err, ok, type Result } from '../../schema';
import type { Http, RequestOptions } from './http';

export const HORIZON_PAGE_LIMIT = 200;

const link = z.object({ href: z.string() });

export const horizonPage = <T extends z.ZodType>(record: T) =>
  z.object({
    _links: z.object({ next: link.optional() }).optional(),
    _embedded: z.object({ records: z.array(record) }),
  });

export type HorizonPage<T> = { records: T[]; next: string | null };

export const HorizonLedger = z.object({
  sequence: z.number().int(),
  hash: z.string(),
  paging_token: z.string(),
  closed_at: z.iso.datetime(),
  successful_transaction_count: z.number().int(),
  failed_transaction_count: z.number().int(),
  operation_count: z.number().int(),
  tx_set_operation_count: z.number().int().nullish(),
  base_fee_in_stroops: z.number().int(),
  base_reserve_in_stroops: z.number().int(),
  protocol_version: z.number().int(),
});
export type HorizonLedger = z.infer<typeof HorizonLedger>;

const innerTransaction = z.object({ hash: z.string(), max_fee: z.string().optional() });

export const HorizonTransaction = z.object({
  id: z.string(),
  hash: z.string(),
  paging_token: z.string(),
  successful: z.boolean(),
  ledger: z.number().int(),
  created_at: z.iso.datetime(),
  source_account: z.string(),
  source_account_sequence: z.string(),
  fee_account: z.string(),
  fee_charged: z.coerce.string(),
  max_fee: z.coerce.string(),
  operation_count: z.number().int(),
  envelope_xdr: z.string(),
  result_xdr: z.string(),
  memo_type: z.string(),
  memo: z.string().optional(),
  preconditions: z
    .object({
      timebounds: z
        .object({ min_time: z.string().optional(), max_time: z.string().optional() })
        .optional(),
    })
    .loose()
    .optional(),
  fee_bump_transaction: innerTransaction.optional(),
  inner_transaction: innerTransaction.optional(),
});
export type HorizonTransaction = z.infer<typeof HorizonTransaction>;

export const HorizonBalance = z
  .object({
    balance: z.string(),
    asset_type: z.string(),
    asset_code: z.string().optional(),
    asset_issuer: z.string().optional(),
    liquidity_pool_id: z.string().optional(),
    limit: z.string().optional(),
    is_authorized: z.boolean().optional(),
  })
  .loose();
export type HorizonBalance = z.infer<typeof HorizonBalance>;

export const HorizonAccount = z.object({
  id: z.string(),
  account_id: z.string(),
  sequence: z.string(),
  subentry_count: z.number().int(),
  home_domain: z.string().optional(),
  last_modified_ledger: z.number().int(),
  thresholds: z.object({
    low_threshold: z.number().int(),
    med_threshold: z.number().int(),
    high_threshold: z.number().int(),
  }),
  flags: z.object({
    auth_required: z.boolean(),
    auth_revocable: z.boolean(),
    auth_immutable: z.boolean(),
    auth_clawback_enabled: z.boolean(),
  }),
  balances: z.array(HorizonBalance),
  signers: z.array(z.object({ key: z.string(), weight: z.number().int(), type: z.string() })),
  num_sponsoring: z.number().int(),
  num_sponsored: z.number().int(),
  sponsor: z.string().optional(),
});
export type HorizonAccount = z.infer<typeof HorizonAccount>;

export const HorizonOperation = z
  .object({
    id: z.string(),
    paging_token: z.string(),
    type: z.string(),
    type_i: z.number().int(),
    source_account: z.string(),
    created_at: z.iso.datetime(),
    transaction_hash: z.string(),
    transaction_successful: z.boolean().optional(),
    funder: z.string().optional(),
    account: z.string().optional(),
  })
  .loose();
export type HorizonOperation = z.infer<typeof HorizonOperation>;

export type Order = 'asc' | 'desc';

export type TransactionsQuery = {
  cursor?: string;
  order?: Order;
  limit?: number;
  includeFailed?: boolean;
};

export type HorizonClient = {
  readonly url: string;
  page<T extends z.ZodType>(
    url: string,
    record: T,
    opts?: RequestOptions,
  ): Promise<Result<HorizonPage<z.infer<T>>>>;
  ledger(seq: number): Promise<Result<HorizonLedger>>;
  latestLedger(): Promise<Result<HorizonLedger>>;
  ledgerTransactions(
    seq: number,
    opts?: { includeFailed?: boolean },
  ): Promise<Result<HorizonTransaction[]>>;
  account(id: string, opts?: RequestOptions): Promise<Result<HorizonAccount | null>>;
  accountOperations(
    id: string,
    query?: { order?: Order; limit?: number; cursor?: string },
  ): Promise<Result<HorizonPage<HorizonOperation>>>;
  transaction(hash: string): Promise<Result<HorizonTransaction | null>>;
  transactions(query?: TransactionsQuery): AsyncGenerator<Result<HorizonPage<HorizonTransaction>>>;
};

const withQuery = (base: string, query: Record<string, string | number | boolean | undefined>) => {
  const url = new URL(base);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
};

const RecordCount = z.object({ _embedded: z.object({ records: z.array(z.unknown()) }) });

const recordCount = (body: string): number => {
  try {
    const parsed = RecordCount.safeParse(JSON.parse(body));
    return parsed.success ? parsed.data._embedded.records.length : 0;
  } catch {
    return 0;
  }
};

const nullOnNotFound = <T>(result: Result<T>): Result<T | null> =>
  !result.ok && result.error.code === 'NOT_FOUND' ? ok(null) : result;

export const createHorizonClient = ({ http, url }: { http: Http; url: string }): HorizonClient => {
  const root = url.replace(/\/+$/, '');

  const page: HorizonClient['page'] = async (pageUrl, record, opts) => {
    const result = await http.getJson(pageUrl, horizonPage(record), opts);
    if (!result.ok) return result;
    return ok({
      records: result.value._embedded.records,
      next: result.value._links?.next?.href ?? null,
    });
  };

  async function* pages<T extends z.ZodType>(
    first: string,
    record: T,
    limit: number,
    opts?: RequestOptions,
  ): AsyncGenerator<Result<HorizonPage<z.infer<T>>>> {
    let next: string | null = first;
    while (next) {
      const result: Result<HorizonPage<z.infer<T>>> = await page(next, record, opts);
      yield result;
      if (!result.ok || result.value.records.length < limit) return;
      next = result.value.next === next ? null : result.value.next;
    }
  }

  const ledgerTransactions: HorizonClient['ledgerTransactions'] = async (
    seq,
    { includeFailed = true } = {},
  ) => {
    const first = withQuery(`${root}/ledgers/${seq}/transactions`, {
      include_failed: includeFailed,
      limit: HORIZON_PAGE_LIMIT,
    });
    const records: HorizonTransaction[] = [];
    for await (const result of pages(first, HorizonTransaction, HORIZON_PAGE_LIMIT)) {
      if (!result.ok) return result;
      records.push(...result.value.records);
    }
    return ok(records);
  };

  const latestLedger: HorizonClient['latestLedger'] = async () => {
    const result = await page(
      withQuery(`${root}/ledgers`, { order: 'desc', limit: 1 }),
      HorizonLedger,
      { cache: false },
    );
    if (!result.ok) return result;
    const [latest] = result.value.records;
    return latest ? ok(latest) : err(appError('UPSTREAM_FAILED', 'Horizon returned no ledgers'));
  };

  return {
    url: root,
    page,
    ledger: (seq) => http.getJson(`${root}/ledgers/${seq}`, HorizonLedger),
    latestLedger,
    ledgerTransactions,
    account: async (id, opts) =>
      nullOnNotFound(await http.getJson(`${root}/accounts/${id}`, HorizonAccount, opts)),
    accountOperations: (id, { order = 'asc', limit = 10, cursor } = {}) =>
      page(
        withQuery(`${root}/accounts/${id}/operations`, { order, limit, cursor }),
        HorizonOperation,
      ),
    transaction: async (hash) =>
      nullOnNotFound(await http.getJson(`${root}/transactions/${hash}`, HorizonTransaction)),
    transactions: ({
      cursor,
      order = 'asc',
      limit = HORIZON_PAGE_LIMIT,
      includeFailed = true,
    } = {}) =>
      pages(
        withQuery(`${root}/transactions`, { cursor, order, limit, include_failed: includeFailed }),
        HorizonTransaction,
        limit,
        { cacheable: (response) => recordCount(response.body) >= limit },
      ),
  };
};
