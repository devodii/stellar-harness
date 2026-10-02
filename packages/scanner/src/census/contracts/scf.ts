import type { AppError, ScfProject } from '@harness/schema';
import { ContractId, getJson } from '@harness/stellar-tools/contracts';
import { z } from 'zod';
import type { Fetcher } from './ports';
import type { ContractRow, ScfTag } from './schemas';

export const PROJECTS_PAGE_SIZE = 50;
export const REPOS_PAGE_SIZE = 100;

const Meta = z.object({
  counts: z.object({ returned: z.number().int(), total: z.number().int().nullable() }),
});

export const StellarlightProject = z.looseObject({
  slug: z.string(),
  name: z.string(),
  scfAwarded: z.boolean().optional(),
  scfAwardedRounds: z.array(z.number().int()).optional(),
  onchain: z
    .looseObject({
      contracts: z
        .array(z.looseObject({ address: z.string() }))
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});
export type StellarlightProject = z.infer<typeof StellarlightProject>;

export const StellarlightRepo = z.looseObject({
  fullName: z.string(),
  scfAwarded: z.boolean().optional(),
  project: z.object({ slug: z.string(), name: z.string().nullable() }).nullable().optional(),
  codeVerified: z
    .looseObject({ mainnetContractId: z.string().nullable().optional() })
    .nullable()
    .optional(),
});
export type StellarlightRepo = z.infer<typeof StellarlightRepo>;

const ProjectsPage = z.object({ meta: Meta, projects: z.array(z.unknown()) });
const ReposPage = z.object({ meta: Meta, repos: z.array(z.unknown()) });

export type Paged<T> = { rows: T[]; pages: number; invalid: number; gap: AppError | null };

const fetchAllPages = async <T>(
  fetch: Fetcher,
  urlFor: (offset: number) => string,
  read: (body: unknown) => { meta: z.infer<typeof Meta>; items: unknown[] } | null,
  rowSchema: z.ZodType<T>,
): Promise<Paged<T>> => {
  const rows: T[] = [];
  let offset = 0;
  let pages = 0;
  let invalid = 0;
  for (;;) {
    const page = await getJson(fetch, urlFor(offset), z.unknown());
    if (!page.ok) return { rows, pages, invalid, gap: page.error };
    const content = read(page.value);
    if (!content) break;
    pages += 1;
    for (const item of content.items) {
      const parsed = rowSchema.safeParse(item);
      if (parsed.success) rows.push(parsed.data);
      else invalid += 1;
    }
    offset += content.meta.counts.returned;
    const total = content.meta.counts.total;
    if (content.meta.counts.returned === 0 || total === null || offset >= total) break;
  }
  return { rows, pages, invalid, gap: null };
};

const base = (url: string) => url.replace(/\/+$/, '');

export const fetchScfProjects = (fetch: Fetcher, stellarlightUrl: string) =>
  fetchAllPages(
    fetch,
    (offset) =>
      `${base(stellarlightUrl)}/api/projects/search?scfAwarded=1&limit=${PROJECTS_PAGE_SIZE}&offset=${offset}`,
    (body) => {
      const page = ProjectsPage.safeParse(body);
      return page.success ? { meta: page.data.meta, items: page.data.projects } : null;
    },
    StellarlightProject,
  );

export const fetchStellarlightRepos = (fetch: Fetcher, stellarlightUrl: string) =>
  fetchAllPages(
    fetch,
    (offset) =>
      `${base(stellarlightUrl)}/api/repos/search?minScore=0&limit=${REPOS_PAGE_SIZE}&offset=${offset}`,
    (body) => {
      const page = ReposPage.safeParse(body);
      return page.success ? { meta: page.data.meta, items: page.data.repos } : null;
    },
    StellarlightRepo,
  );

export type ScfIndex = { byContract: Map<string, ScfTag>; projects: ScfProject[] };

const isContractId = (value: string | null | undefined): value is string =>
  ContractId.safeParse(value).success;

const latestRound = (rounds: number[] | undefined): number | null =>
  rounds && rounds.length > 0 ? Math.max(...rounds) : null;

export const buildScfIndex = (
  projects: StellarlightProject[],
  repos: StellarlightRepo[],
): ScfIndex => {
  const bySlug = new Map<string, ScfProject>();
  for (const project of projects) {
    if (project.scfAwarded === false) continue;
    bySlug.set(project.slug, {
      slug: project.slug,
      name: project.name,
      round: latestRound(project.scfAwardedRounds),
      contracts: (project.onchain?.contracts ?? [])
        .map((contract) => contract.address)
        .filter(isContractId),
    });
  }
  for (const repo of repos) {
    const contractId = repo.codeVerified?.mainnetContractId;
    const linked = repo.project;
    if (!isContractId(contractId) || !linked) continue;
    let project = bySlug.get(linked.slug);
    if (!project && repo.scfAwarded) {
      project = { slug: linked.slug, name: linked.name ?? linked.slug, round: null, contracts: [] };
      bySlug.set(linked.slug, project);
    }
    if (project && !project.contracts.includes(contractId)) project.contracts.push(contractId);
  }
  const byContract = new Map<string, ScfTag>();
  for (const project of bySlug.values()) {
    for (const contract of project.contracts) {
      if (!byContract.has(contract)) {
        byContract.set(contract, { slug: project.slug, name: project.name, round: project.round });
      }
    }
  }
  return {
    byContract,
    projects: [...bySlug.values()].filter((project) => project.contracts.length > 0),
  };
};

export const applyScf = (rows: ContractRow[], index: ScfIndex): ContractRow[] =>
  rows.map((row) => ({ ...row, scf: index.byContract.get(row.contract) ?? null }));

export const scfTags = (scf: ScfTag | null): string[] =>
  scf
    ? ['scf_funded', `scf:${scf.slug}`, ...(scf.round === null ? [] : [`scf_round_${scf.round}`])]
    : [];
