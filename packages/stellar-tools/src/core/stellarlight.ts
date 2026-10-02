import { ok, type Result } from '@harness/schema';
import { z } from 'zod';
import type { Http, RequestOptions } from './http';

const count = z.number().int().nonnegative();
const optionalText = z.string().nullish();
const textList = z
  .array(z.string())
  .nullish()
  .transform((items) => items ?? []);

export const StellarlightMeta = z
  .object({
    generatedAt: z.string().optional(),
    matchMode: z.string().optional(),
    counts: z.object({ returned: count, total: count.nullable().optional() }).loose().optional(),
  })
  .loose();
export type StellarlightMeta = z.infer<typeof StellarlightMeta>;

export const PARTNER_TYPES = [
  'anchor',
  'on-off-ramp',
  'infrastructure',
  'tooling',
  'protocol',
  'wallet',
  'audit-firm',
  'legal',
  'agency',
  'asset-issuer',
  'other',
] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export const StellarlightPartner = z
  .object({
    slug: z.string(),
    name: z.string(),
    partnerType: z.string(),
    websiteUrl: optionalText,
    tomlSourceUrl: optionalText,
    tomlFetchedAt: optionalText,
    seps: textList,
    rampTypes: textList,
    assets: textList,
    regions: textList,
    country: optionalText,
    url: z.string().optional(),
  })
  .loose();
export type StellarlightPartner = z.infer<typeof StellarlightPartner>;

export const StellarlightOnchainContract = z
  .object({
    address: z.string(),
    label: optionalText,
    events: z.number().nullish(),
    subinvocations: z.number().nullish(),
    storageEntries: z.number().nullish(),
    createdAt: optionalText,
    verifiedRepo: optionalText,
  })
  .loose();

export const StellarlightProject = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    category: optionalText,
    status: optionalText,
    scfAwarded: z.boolean().default(false),
    scfTotalAwardedUSD: z.number().nullish(),
    scfAwardedRounds: z
      .array(z.number().int())
      .nullish()
      .transform((rounds) => rounds ?? []),
    scfRoundAwards: z
      .array(
        z
          .object({
            round: z.number().int().nullable(),
            awardName: optionalText,
            amountUSD: z.number().nullish(),
            awardType: optionalText,
          })
          .loose(),
      )
      .nullish(),
    onchain: z
      .object({ contracts: z.array(StellarlightOnchainContract).nullish() })
      .loose()
      .nullish(),
    links: z.record(z.string(), z.string()).nullish(),
    url: z.string().optional(),
  })
  .loose();
export type StellarlightProject = z.infer<typeof StellarlightProject>;

export const StellarlightRepo = z
  .object({
    fullName: z.string(),
    url: optionalText,
    primaryLanguage: optionalText,
    activityState: optionalText,
    scfAwarded: z.boolean().optional(),
    repoScore: z.number(),
    project: z.object({ slug: z.string(), name: optionalText }).nullish(),
    codeVerified: z
      .object({
        mainnetContractId: optionalText,
        isDeployableContract: z.boolean().optional(),
      })
      .loose()
      .nullish(),
  })
  .loose();
export type StellarlightRepo = z.infer<typeof StellarlightRepo>;

const PartnersResponse = z.object({
  meta: StellarlightMeta,
  partners: z.array(StellarlightPartner),
});
const ProjectsResponse = z.object({
  meta: StellarlightMeta,
  projects: z.array(StellarlightProject),
});
const ReposResponse = z.object({ meta: StellarlightMeta, repos: z.array(StellarlightRepo) });

export type PartnersQuery = { type?: PartnerType; all?: boolean; limit?: number; q?: string };
export type ProjectsQuery = {
  q?: string;
  scfAwarded?: boolean;
  type?: string;
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
};
export type ReposQuery = {
  q?: string;
  minScore?: number;
  language?: string;
  activity?: string;
  limit?: number;
  offset?: number;
};

export type StellarlightPage<T> = { meta: StellarlightMeta; rows: T[] };

export type StellarlightClient = {
  readonly url: string;
  partners(query?: PartnersQuery): Promise<Result<StellarlightPage<StellarlightPartner>>>;
  projectsSearch(query?: ProjectsQuery): Promise<Result<StellarlightPage<StellarlightProject>>>;
  reposSearch(query?: ReposQuery): Promise<Result<StellarlightPage<StellarlightRepo>>>;
  allProjects(query?: ProjectsQuery): AsyncGenerator<Result<StellarlightPage<StellarlightProject>>>;
  allRepos(query?: ReposQuery): AsyncGenerator<Result<StellarlightPage<StellarlightRepo>>>;
};

export const projectContractIds = (project: StellarlightProject): string[] =>
  (project.onchain?.contracts ?? []).map((contract) => contract.address);

export const repoMainnetContractId = (repo: StellarlightRepo): string | null =>
  repo.codeVerified?.mainnetContractId ?? null;

type QueryValue = string | number | boolean | undefined;

const withQuery = (base: string, query: Record<string, QueryValue>) => {
  const url = new URL(base);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    url.searchParams.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  }
  return url.toString();
};

export const isLastPage = (meta: StellarlightMeta, offset: number, limit: number): boolean => {
  const returned = meta.counts?.returned ?? 0;
  const total = meta.counts?.total;
  if (returned === 0) return true;
  if (typeof total === 'number') return offset + returned >= total;
  return returned < limit;
};

export const createStellarlightClient = ({
  http,
  url,
  opts,
}: {
  http: Http;
  url: string;
  opts?: RequestOptions;
}): StellarlightClient => {
  const api = `${url.replace(/\/+$/, '')}/api`;

  const partners: StellarlightClient['partners'] = async ({
    type,
    all = true,
    limit = 100,
    q,
  } = {}) => {
    const result = await http.getJson(
      withQuery(`${api}/partners`, { type, all: all ? '1' : undefined, limit, q }),
      PartnersResponse,
      opts,
    );
    return result.ok ? ok({ meta: result.value.meta, rows: result.value.partners }) : result;
  };

  const projectsSearch: StellarlightClient['projectsSearch'] = async (query = {}) => {
    const result = await http.getJson(
      withQuery(`${api}/projects/search`, { limit: 50, offset: 0, ...query }),
      ProjectsResponse,
      opts,
    );
    return result.ok ? ok({ meta: result.value.meta, rows: result.value.projects }) : result;
  };

  const reposSearch: StellarlightClient['reposSearch'] = async (query = {}) => {
    const result = await http.getJson(
      withQuery(`${api}/repos/search`, { minScore: 0, limit: 100, offset: 0, ...query }),
      ReposResponse,
      opts,
    );
    return result.ok ? ok({ meta: result.value.meta, rows: result.value.repos }) : result;
  };

  async function* pageAll<T, Q extends { limit?: number; offset?: number }>(
    search: (query: Q) => Promise<Result<StellarlightPage<T>>>,
    query: Q,
    defaultLimit: number,
  ): AsyncGenerator<Result<StellarlightPage<T>>> {
    const limit = query.limit ?? defaultLimit;
    let offset = query.offset ?? 0;
    while (true) {
      const page = await search({ ...query, limit, offset });
      yield page;
      if (!page.ok || isLastPage(page.value.meta, offset, limit)) return;
      offset += page.value.rows.length;
    }
  }

  return {
    url: api,
    partners,
    projectsSearch,
    reposSearch,
    allProjects: (query = {}) => pageAll(projectsSearch, query, 50),
    allRepos: (query = {}) => pageAll(reposSearch, query, 100),
  };
};
