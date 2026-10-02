import {
  type AnchorToml,
  endpointHosts,
  hostOf,
  normalizeDomain,
  stripWww,
  tomlUrlFor,
} from '@harness/stellar-tools/anchors';
import { countryCode } from './country';
import { fetchTopAssets, type TopAsset } from './expert';
import { getText } from './http';
import type { Fetcher, HorizonPort } from './ports';
import {
  isAnchorRelevant,
  MEDIUM_FEED_URL,
  parseRecapFeed,
  type RecapProject,
  SCF_ROUNDS,
} from './scf-recaps';
import type {
  AnchorDomain,
  DomainSource,
  StellarlightPartner,
  StellarlightProject,
} from './schemas';
import {
  fetchAnchorProjects,
  fetchPartners,
  fetchScfAwardedProjects,
  type PartnerType,
  searchProjectByName,
} from './stellarlight';

export type DomainCandidate = {
  domain: string;
  source: DomainSource;
  name?: string | null;
  country?: string | null;
  regions?: string[];
  seps?: string[];
  scfRounds?: number[];
  slug?: string | null;
  websiteUrl?: string | null;
};

const IGNORED_HOSTS = new Set([
  'github.com',
  'x.com',
  'twitter.com',
  'medium.com',
  'linktr.ee',
  't.me',
  'discord.gg',
  'linkedin.com',
  'youtube.com',
]);

export const websiteDomain = (url: string | null | undefined): string | null => {
  const host = url ? hostOf(url) : null;
  if (!host) return null;
  const domain = stripWww(host);
  return IGNORED_HOSTS.has(domain) ? null : domain;
};

export const partnerCandidate = (partner: StellarlightPartner): DomainCandidate | null => {
  const domain =
    (partner.tomlSourceUrl ? hostOf(partner.tomlSourceUrl) : null) ??
    websiteDomain(partner.websiteUrl);
  if (!domain) return null;
  return {
    domain,
    source: 'stellarlight_partner',
    name: partner.name,
    country: partner.country ?? null,
    regions: partner.regions ?? [],
    seps: partner.seps ?? [],
    slug: partner.slug,
    websiteUrl: partner.websiteUrl ?? null,
  };
};

export const projectCandidate = (
  project: StellarlightProject,
  source: DomainSource,
  partnerDomains: Map<string, string>,
  extraRounds: number[] = [],
): DomainCandidate | null => {
  const profile = project.anchorProfile ?? null;
  const domain =
    (profile?.slug ? partnerDomains.get(profile.slug) : undefined) ??
    websiteDomain(project.links?.website);
  if (!domain) return null;
  return {
    domain,
    source,
    name: project.name,
    country: profile?.country ?? null,
    regions: profile?.regions ?? [],
    seps: profile?.seps ?? [],
    scfRounds: [...(project.scfAwardedRounds ?? []), ...extraRounds],
    slug: project.slug,
    websiteUrl: project.links?.website ?? null,
  };
};

const union = <T>(a: T[], b: T[] = []): T[] => [...new Set([...a, ...b])];

export const mergeCandidates = (candidates: DomainCandidate[]): AnchorDomain[] => {
  const merged = new Map<string, AnchorDomain>();
  for (const candidate of candidates) {
    const domain = normalizeDomain(candidate.domain);
    if (!domain) continue;
    const current = merged.get(domain) ?? {
      domain,
      name: null,
      country: null,
      countryName: null,
      regions: [],
      seps: [],
      scfRounds: [],
      sources: [],
      slugs: [],
      websiteUrl: null,
      tomlUrl: tomlUrlFor(domain),
    };
    const countryName = current.countryName ?? candidate.country ?? null;
    merged.set(domain, {
      ...current,
      name: current.name ?? candidate.name ?? null,
      countryName,
      country: current.country ?? countryCode(candidate.country),
      regions: union(current.regions, candidate.regions).sort(),
      seps: union(current.seps, candidate.seps).sort(),
      scfRounds: union(current.scfRounds, candidate.scfRounds).sort((a, b) => a - b),
      sources: union(current.sources, [candidate.source]),
      slugs: union(current.slugs, candidate.slug ? [candidate.slug] : []),
      websiteUrl: current.websiteUrl ?? candidate.websiteUrl ?? null,
    });
  }
  return [...merged.values()];
};

export const transitiveCandidates = (
  tomls: AnchorToml[],
  known: Iterable<string>,
): DomainCandidate[] => {
  const seen = new Set(known);
  return tomls.flatMap(endpointHosts).flatMap((domain) => {
    if (seen.has(domain)) return [];
    seen.add(domain);
    return [{ domain, source: 'transitive' as const }];
  });
};

export type DomainListPorts = { fetch: Fetcher; horizon: HorizonPort };

export type DomainListOptions = {
  stellarlightUrl: string;
  expertUrl: string;
  mediumFeedUrl?: string;
  scfRounds?: readonly number[];
  assetLimit?: number;
  limit?: number;
};

export type ScfSource = 'medium' | 'stellarlight' | 'none';

export type DomainList = {
  domains: AnchorDomain[];
  gaps: string[];
  scfSource: ScfSource;
  unresolvedScfProjects: string[];
  counts: Record<DomainSource, number>;
};

type Collector = { candidates: DomainCandidate[]; gaps: string[] };

const partnerSource = async (ports: DomainListPorts, base: string, out: Collector) => {
  const partnerDomains = new Map<string, string>();
  for (const type of ['anchor', 'on-off-ramp'] satisfies PartnerType[]) {
    const partners = await fetchPartners(ports.fetch, base, type);
    if (!partners.ok) {
      out.gaps.push(`stellarlight partners type=${type}: ${partners.error.message}`);
      continue;
    }
    for (const partner of partners.value) {
      const candidate = partnerCandidate(partner);
      if (!candidate) continue;
      partnerDomains.set(partner.slug, candidate.domain);
      out.candidates.push(candidate);
    }
  }
  return partnerDomains;
};

const projectSource = async (
  ports: DomainListPorts,
  base: string,
  partnerDomains: Map<string, string>,
  out: Collector,
) => {
  const projects = await fetchAnchorProjects(ports.fetch, base);
  if (!projects.ok) {
    out.gaps.push(`stellarlight projects type=Anchor: ${projects.error.message}`);
    return;
  }
  for (const project of projects.value) {
    const candidate = projectCandidate(project, 'stellarlight_project', partnerDomains);
    if (candidate) out.candidates.push(candidate);
  }
};

const recapSource = async (
  ports: DomainListPorts,
  opts: DomainListOptions,
  partnerDomains: Map<string, string>,
  out: Collector,
): Promise<{ used: boolean; unresolved: string[] }> => {
  const rounds = opts.scfRounds ?? SCF_ROUNDS;
  const feed = await getText(ports.fetch, opts.mediumFeedUrl ?? MEDIUM_FEED_URL);
  if (!feed.ok) {
    out.gaps.push(`medium scf recaps: ${feed.error.message}`);
    return { used: false, unresolved: [] };
  }
  const recap = parseRecapFeed(feed.value).filter((p) => rounds.includes(p.round));
  if (recap.length === 0) {
    out.gaps.push(`medium scf recaps: no projects parsed for rounds ${rounds.join(',')}`);
    return { used: false, unresolved: [] };
  }
  const unresolved: string[] = [];
  for (const entry of recap.filter(isAnchorRelevant)) {
    const resolved = await resolveRecapProject(ports.fetch, opts.stellarlightUrl, entry);
    const candidate = resolved
      ? projectCandidate(resolved, 'scf_recap', partnerDomains, [entry.round])
      : null;
    if (candidate) out.candidates.push(candidate);
    else unresolved.push(`${entry.name} (SCF #${entry.round})`);
  }
  return { used: true, unresolved };
};

const resolveRecapProject = async (
  fetch: Fetcher,
  base: string,
  entry: RecapProject,
): Promise<StellarlightProject | null> => {
  const words = entry.name.split(/\s+/);
  const queries = union([entry.name], words.length > 1 && words[0] ? [words[0]] : []);
  for (const query of queries) {
    const result = await searchProjectByName(fetch, base, query);
    if (result.ok && result.value) return result.value;
  }
  return null;
};

const awardedFallback = async (
  ports: DomainListPorts,
  opts: DomainListOptions,
  partnerDomains: Map<string, string>,
  out: Collector,
): Promise<boolean> => {
  const rounds = opts.scfRounds ?? SCF_ROUNDS;
  const awarded = await fetchScfAwardedProjects(ports.fetch, opts.stellarlightUrl);
  if (!awarded.ok) {
    out.gaps.push(`stellarlight scfAwarded projects: ${awarded.error.message}`);
    return false;
  }
  for (const project of awarded.value) {
    const inRounds = (project.scfAwardedRounds ?? []).some((r) => rounds.includes(r));
    const anchorLike = (project.types ?? []).includes('Anchor') || Boolean(project.anchorProfile);
    if (!inRounds || !anchorLike) continue;
    const candidate = projectCandidate(project, 'stellarlight_project', partnerDomains);
    if (candidate) out.candidates.push(candidate);
  }
  return true;
};

const assetDomain = async (horizon: HorizonPort, asset: TopAsset): Promise<string | null> => {
  if (asset.domain) return asset.domain;
  const account = await horizon.account(asset.issuer);
  return account.ok ? (account.value?.home_domain?.trim() ?? null) || null : null;
};

const assetSource = async (ports: DomainListPorts, opts: DomainListOptions, out: Collector) => {
  const assets = await fetchTopAssets(ports.fetch, opts.expertUrl, opts.assetLimit ?? 200);
  if (!assets.ok) {
    out.gaps.push(`stellar.expert assets: ${assets.error.message}`);
    return;
  }
  const domains = await Promise.all(assets.value.map((asset) => assetDomain(ports.horizon, asset)));
  for (const domain of domains) {
    if (domain) out.candidates.push({ domain, source: 'stellar_expert_asset' });
  }
};

const countSources = (domains: AnchorDomain[]): Record<DomainSource, number> => {
  const counts: Record<DomainSource, number> = {
    stellarlight_partner: 0,
    stellarlight_project: 0,
    scf_recap: 0,
    stellar_expert_asset: 0,
    transitive: 0,
  };
  for (const domain of domains) for (const source of domain.sources) counts[source] += 1;
  return counts;
};

export const buildDomainList = async (
  ports: DomainListPorts,
  opts: DomainListOptions,
): Promise<DomainList> => {
  const out: Collector = { candidates: [], gaps: [] };
  const partnerDomains = await partnerSource(ports, opts.stellarlightUrl, out);
  await projectSource(ports, opts.stellarlightUrl, partnerDomains, out);
  const recap = await recapSource(ports, opts, partnerDomains, out);
  const scfSource: ScfSource = recap.used
    ? 'medium'
    : (await awardedFallback(ports, opts, partnerDomains, out))
      ? 'stellarlight'
      : 'none';
  await assetSource(ports, opts, out);
  const merged = mergeCandidates(out.candidates);
  const domains = opts.limit ? merged.slice(0, opts.limit) : merged;
  return {
    domains,
    gaps: out.gaps,
    scfSource,
    unresolvedScfProjects: recap.unresolved,
    counts: countSources(domains),
  };
};
