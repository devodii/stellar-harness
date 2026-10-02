import { z } from 'zod';
import { fail } from '../tool';
import { defineNamedTool } from './define';
import type { EcosystemProject, EcosystemRepo } from './schemas';

export type StellarlightContext = {
  stellarlight: { get: (path: string) => Promise<unknown> };
};

const CONTRACT_ID = /^C[A-Z2-7]{55}$/;

const RawProject = z.object({
  slug: z.string(),
  name: z.string(),
  shortDescription: z.string().nullish(),
  links: z.object({ website: z.string().nullish() }).loose().nullish(),
  scfAwarded: z.boolean().nullish(),
  scfAwardedRounds: z.array(z.number().int()).nullish(),
  onchain: z
    .object({ contracts: z.array(z.object({ address: z.string() }).loose()).nullish() })
    .loose()
    .nullish(),
});

const RawRepo = z.object({
  fullName: z.string(),
  url: z.string(),
  description: z.string().nullish(),
  repoScore: z.number().nullish(),
  mainnetContractId: z.string().nullish(),
  codeVerified: z.object({ mainnetContractId: z.string().nullish() }).loose().nullish(),
});

const ProjectPage = z.object({ projects: z.array(RawProject) });
const RepoPage = z.object({ repos: z.array(RawRepo) });

const asUrl = (value: string | null | undefined): string | null =>
  value && URL.canParse(value) ? value : null;

const asContract = (value: string | null | undefined): string | null =>
  value && CONTRACT_ID.test(value) ? value : null;

export const toProject = (raw: z.infer<typeof RawProject>): EcosystemProject => ({
  slug: raw.slug,
  name: raw.name,
  description: raw.shortDescription ?? null,
  website: asUrl(raw.links?.website),
  scfAwarded: raw.scfAwarded ?? false,
  scfRound: raw.scfAwardedRounds?.length ? Math.max(...raw.scfAwardedRounds) : null,
  contracts: (raw.onchain?.contracts ?? [])
    .map((contract) => asContract(contract.address))
    .filter((address): address is string => address !== null),
});

export const toRepo = (raw: z.infer<typeof RawRepo>): EcosystemRepo | null => {
  const url = asUrl(raw.url);
  if (!url) return null;
  return {
    name: raw.fullName,
    url,
    description: raw.description ?? null,
    score: raw.repoScore ?? null,
    mainnetContractId: asContract(raw.mainnetContractId ?? raw.codeVerified?.mainnetContractId),
  };
};

const getPage = async <T extends z.ZodType>(
  ctx: StellarlightContext,
  path: string,
  schema: T,
): Promise<z.infer<T>> => {
  const parsed = schema.safeParse(await ctx.stellarlight.get(path));
  return parsed.success
    ? parsed.data
    : fail('UPSTREAM_FAILED', `Unexpected stellarlight response for ${path}`);
};

export const searchEcosystem = defineNamedTool(
  'searchEcosystem',
  async ({ query, limit }, ctx: StellarlightContext) => {
    const q = encodeURIComponent(query);
    const [projects, repos] = await Promise.all([
      getPage(ctx, `/api/projects/search?q=${q}&limit=${limit}`, ProjectPage),
      getPage(ctx, `/api/repos/search?q=${q}&limit=${limit}`, RepoPage),
    ]);
    return {
      query,
      projects: projects.projects.map(toProject),
      repos: repos.repos.map(toRepo).filter((repo): repo is EcosystemRepo => repo !== null),
    };
  },
);
