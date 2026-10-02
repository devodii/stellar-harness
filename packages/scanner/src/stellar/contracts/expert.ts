import { z } from 'zod';
import { ok, type Result } from '../../schema';
import { getJson } from './json';
import type { Fetcher } from './ports';
import { ExpertContract } from './schemas';

export const ExpertContractPage = z.object({
  _links: z.object({ next: z.object({ href: z.string() }).optional() }),
  _embedded: z.object({ records: z.array(z.unknown()) }),
});

export type ExpertPage = {
  records: ExpertContract[];
  invalid: number;
  nextUrl: string | null;
};

const trimSlash = (url: string): string => url.replace(/\/+$/, '');

export const expertContractUrl = (baseUrl: string, contractId: string): string =>
  `${trimSlash(baseUrl)}/contract/${contractId}`;

export const expertContractsUrl = (
  baseUrl: string,
  options: { limit: number; cursor?: string },
): string => {
  const cursor = options.cursor ? `&cursor=${encodeURIComponent(options.cursor)}` : '';
  return `${trimSlash(baseUrl)}/contract?limit=${options.limit}&order=desc${cursor}`;
};

export const resolveExpertHref = (baseUrl: string, href: string): string =>
  new URL(href, baseUrl).toString();

export const cursorOf = (url: string): string | null => new URL(url).searchParams.get('cursor');

export const fetchExpertContract = (
  fetch: Fetcher,
  baseUrl: string,
  contractId: string,
): Promise<Result<ExpertContract | null>> =>
  getJson(fetch, expertContractUrl(baseUrl, contractId), ExpertContract);

export const fetchExpertContractPage = async (
  fetch: Fetcher,
  baseUrl: string,
  url: string,
): Promise<Result<ExpertPage>> => {
  const page = await getJson(fetch, url, ExpertContractPage);
  if (!page.ok) return page;
  if (!page.value) return ok({ records: [], invalid: 0, nextUrl: null });
  const parsed = page.value._embedded.records.map((record) => ExpertContract.safeParse(record));
  const records = parsed.flatMap((result) => (result.success ? [result.data] : []));
  const next = page.value._links.next?.href;
  return ok({
    records,
    invalid: parsed.length - records.length,
    nextUrl: next && parsed.length > 0 ? resolveExpertHref(baseUrl, next) : null,
  });
};
