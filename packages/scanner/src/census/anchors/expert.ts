import { ok, type Result } from '../../schema';
import { getJsonAs, parseRows } from './http';
import type { Fetcher } from './ports';
import { ExpertAsset, ExpertAssetsResponse } from './schemas';

export type TopAsset = { asset: string; code: string; issuer: string; domain: string | null };

export const topAssetsUrl = (base: string, limit: number): string =>
  `${base.replace(/\/+$/, '')}/asset?limit=${limit}&order=desc&sort=trustlines`;

export const parseAssetId = (asset: string): { code: string; issuer: string } | null => {
  const match = asset.match(/^([A-Za-z0-9]{1,12})-(G[A-Z2-7]{55})(?:-\d+)?$/);
  return match?.[1] && match[2] ? { code: match[1], issuer: match[2] } : null;
};

export const toTopAsset = (record: ExpertAsset): TopAsset | null => {
  const id = parseAssetId(record.asset);
  return id ? { asset: record.asset, ...id, domain: record.domain?.trim() || null } : null;
};

export const fetchTopAssets = async (
  fetch: Fetcher,
  base: string,
  limit = 200,
): Promise<Result<TopAsset[]>> => {
  const response = await getJsonAs(fetch, topAssetsUrl(base, limit), ExpertAssetsResponse);
  if (!response.ok) return response;
  return ok(
    parseRows(response.value._embedded.records, ExpertAsset)
      .map(toTopAsset)
      .filter((asset): asset is TopAsset => asset !== null),
  );
};
