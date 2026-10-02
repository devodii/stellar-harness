import { ok, type Result } from '../../schema';
import { getJsonAs, parseRows } from './http';
import type { Fetcher } from './ports';
import {
  PartnersResponse,
  ProjectsResponse,
  StellarlightPartner,
  StellarlightProject,
} from './schemas';

export type PartnerType = 'anchor' | 'on-off-ramp';

const PROJECT_FIELDS = 'name,slug,links,scfAwardedRounds,types,anchorProfile';
const PAGE_SIZE = 100;
const MAX_PAGES = 50;

const trimBase = (base: string): string => base.replace(/\/+$/, '');

export const partnersUrl = (base: string, type: PartnerType): string =>
  `${trimBase(base)}/api/partners?type=${type}&all=1&limit=100`;

export const fetchPartners = async (
  fetch: Fetcher,
  base: string,
  type: PartnerType,
): Promise<Result<StellarlightPartner[]>> => {
  const response = await getJsonAs(fetch, partnersUrl(base, type), PartnersResponse);
  return response.ok ? ok(parseRows(response.value.partners, StellarlightPartner)) : response;
};

export const projectSearchUrl = (base: string, params: Record<string, string | number>): string => {
  const query = new URLSearchParams(
    Object.entries({ ...params, fields: PROJECT_FIELDS }).map(([k, v]): [string, string] => [
      k,
      String(v),
    ]),
  );
  return `${trimBase(base)}/api/projects/search?${query.toString()}`;
};

export const searchProjectsPaged = async (
  fetch: Fetcher,
  base: string,
  params: Record<string, string | number>,
): Promise<Result<StellarlightProject[]>> => {
  const projects: StellarlightProject[] = [];
  for (let page = 0, offset = 0; page < MAX_PAGES; page += 1) {
    const url = projectSearchUrl(base, { ...params, limit: PAGE_SIZE, offset });
    const response = await getJsonAs(fetch, url, ProjectsResponse);
    if (!response.ok) return response;
    const { counts } = response.value.meta;
    projects.push(...parseRows(response.value.projects, StellarlightProject));
    offset += counts.returned;
    if (counts.returned === 0 || counts.total === null || offset >= counts.total) break;
  }
  return ok(projects);
};

export const fetchAnchorProjects = (fetch: Fetcher, base: string) =>
  searchProjectsPaged(fetch, base, { type: 'Anchor' });

export const fetchScfAwardedProjects = (fetch: Fetcher, base: string) =>
  searchProjectsPaged(fetch, base, { scfAwarded: 1 });

const comparable = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, '');

export const searchProjectByName = async (
  fetch: Fetcher,
  base: string,
  name: string,
): Promise<Result<StellarlightProject | null>> => {
  const response = await getJsonAs(
    fetch,
    projectSearchUrl(base, { q: name, limit: 5 }),
    ProjectsResponse,
  );
  if (!response.ok) return response;
  const wanted = comparable(name);
  const projects = parseRows(response.value.projects, StellarlightProject);
  return ok(
    projects.find((p) => comparable(p.name) === wanted || comparable(p.slug) === wanted) ?? null,
  );
};
