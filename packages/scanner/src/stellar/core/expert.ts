import { z } from 'zod';
import { ok, type Result } from '../../schema';
import type { Http, RequestOptions } from './http';

export const EXPERT_PAGE_LIMIT = 200;

export const EXPERT_ASSET_SORTS = [
  'rating',
  'trustlines',
  'trades',
  'payments',
  'volume7d',
] as const;
export type ExpertAssetSort = (typeof EXPERT_ASSET_SORTS)[number];

const expertPage = <T extends z.ZodType>(record: T) =>
  z.object({
    _links: z.object({ next: z.object({ href: z.string() }).optional() }).optional(),
    _embedded: z.object({ records: z.array(record) }),
  });

export type ExpertPage<T> = { records: T[]; next: string | null };

const count = z.number().int().nonnegative();

export const ExpertContract = z
  .object({
    contract: z.string(),
    created: z.number().int(),
    creator: z.string().optional(),
    wasm: z.string().optional(),
    asset: z.string().optional(),
    invocations: count.default(0),
    subinvocation: count.default(0),
    events: count.default(0),
    errors: count.default(0),
    paging_token: z.string().optional(),
    code: z.string().optional(),
    token_name: z.string().optional(),
    features: z.array(z.string()).optional(),
  })
  .loose();
export type ExpertContract = z.infer<typeof ExpertContract>;

export const ExpertContractDetail = ExpertContract.extend({
  storage_entries: count.optional(),
  validation: z.object({ status: z.string() }).loose().optional(),
});
export type ExpertContractDetail = z.infer<typeof ExpertContractDetail>;

export const ExpertAsset = z
  .object({
    asset: z.string(),
    code: z.string().optional(),
    domain: z.string().optional(),
    contract: z.string().optional(),
    created: z.number().optional(),
    supply: z.string().optional(),
    payments: count.optional(),
    trades: count.optional(),
    volume7d: z.number().optional(),
    price: z.number().optional(),
    trustlines: z.object({ total: count, authorized: count, funded: count }).partial().optional(),
    rating: z.object({ average: z.number() }).loose().optional(),
    paging_token: z.union([z.number(), z.string()]).optional(),
  })
  .loose();
export type ExpertAsset = z.infer<typeof ExpertAsset>;

export type ExpertPageQuery = { order?: 'asc' | 'desc'; limit?: number; cursor?: string };

export type ExpertClient = {
  readonly url: string;
  contracts(query?: ExpertPageQuery): AsyncGenerator<Result<ExpertPage<ExpertContract>>>;
  contract(id: string, opts?: RequestOptions): Promise<Result<ExpertContractDetail | null>>;
  assets(
    query?: ExpertPageQuery & { sort?: ExpertAssetSort },
  ): Promise<Result<ExpertPage<ExpertAsset>>>;
};

export const parseExpertAsset = (asset: string): { code: string; issuer: string | null } | null => {
  if (asset === 'XLM') return { code: 'XLM', issuer: null };
  const [code, issuer] = asset.split('-');
  return code && issuer?.startsWith('G') ? { code, issuer } : null;
};

const withQuery = (base: string, query: Record<string, string | number | undefined>) => {
  const url = new URL(base);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
};

const nullOnMissing = <T>(result: Result<T>): Result<T | null> => {
  if (result.ok) return result;
  const status = result.error.meta?.status;
  return status === 404 || status === 400 ? ok(null) : result;
};

export const createExpertClient = ({ http, url }: { http: Http; url: string }): ExpertClient => {
  const root = url.replace(/\/+$/, '');

  const page = async <T extends z.ZodType>(
    pageUrl: string,
    record: T,
  ): Promise<Result<ExpertPage<z.infer<T>>>> => {
    const result = await http.getJson(pageUrl, expertPage(record));
    if (!result.ok) return result;
    const next = result.value._links?.next?.href;
    return ok({
      records: result.value._embedded.records,
      next: next ? new URL(next, pageUrl).toString() : null,
    });
  };

  async function* contracts({
    order = 'desc',
    limit = EXPERT_PAGE_LIMIT,
    cursor,
  }: ExpertPageQuery = {}): AsyncGenerator<Result<ExpertPage<ExpertContract>>> {
    let next: string | null = withQuery(`${root}/contract`, { order, limit, cursor });
    while (next) {
      const current: string = next;
      const result: Result<ExpertPage<ExpertContract>> = await page(current, ExpertContract);
      if (!result.ok || result.value.records.length === 0) {
        if (!result.ok) yield result;
        return;
      }
      yield result;
      next = result.value.next === current ? null : result.value.next;
    }
  }

  return {
    url: root,
    contracts,
    contract: async (id, opts) =>
      nullOnMissing(await http.getJson(`${root}/contract/${id}`, ExpertContractDetail, opts)),
    assets: ({ sort = 'rating', order = 'desc', limit = EXPERT_PAGE_LIMIT, cursor } = {}) =>
      page(withQuery(`${root}/asset`, { sort, order, limit, cursor }), ExpertAsset),
  };
};
