import type { Fetcher } from './ports';
import { getJson, isRecord, type JsonProbe, joinUrl, toEndpointProbe } from './request';
import type { AnchorToml, InfoAsset, InfoServer, StageRecord, TransferSep } from './schemas';
import { SKIP_REASONS, skippedStage, stageRecord, startTimer } from './stage';

const amount = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
};

export const infoAssets = (section: unknown): InfoAsset[] =>
  isRecord(section)
    ? Object.entries(section).flatMap(([code, entry]) =>
        isRecord(entry)
          ? [
              {
                code,
                enabled: entry.enabled === true,
                feeFixed: amount(entry.fee_fixed),
                minAmount: amount(entry.min_amount),
              },
            ]
          : [],
      )
    : [];

export const hasTransferSections = (json: unknown): json is Record<string, unknown> =>
  isRecord(json) && (isRecord(json.deposit) || isRecord(json.withdraw));

export type InfoProbe = { server: InfoServer; probe: JsonProbe };

export const readTransferInfo = async (
  sep: TransferSep,
  base: string,
  fetch: Fetcher,
): Promise<InfoProbe> => {
  const probe = await getJson(fetch, joinUrl(base, 'info'));
  const valid = probe.ok && hasTransferSections(probe.json);
  const json = valid && isRecord(probe.json) ? probe.json : {};
  const server: InfoServer = {
    ...toEndpointProbe(probe),
    ok: valid,
    error: probe.ok && !valid ? 'missing_deposit_and_withdraw' : probe.error,
    sep,
    deposit: infoAssets(json.deposit),
    withdraw: infoAssets(json.withdraw),
  };
  return { server, probe };
};

export const transferServers = (toml: AnchorToml): [TransferSep, string][] =>
  (
    [
      ['sep6', toml.transferServer],
      ['sep24', toml.transferServerSep24],
    ] as const
  ).flatMap(([sep, url]) => (url ? [[sep, url] as [TransferSep, string]] : []));

export type InfoOutcome = { record: StageRecord; servers: InfoServer[]; probes: InfoProbe[] };

export const probeInfo = async (toml: AnchorToml, fetch: Fetcher): Promise<InfoOutcome> => {
  const targets = transferServers(toml);
  if (targets.length === 0) {
    return { record: skippedStage('info', SKIP_REASONS.notApplicable), servers: [], probes: [] };
  }
  const elapsed = startTimer();
  const probes = await Promise.all(targets.map(([sep, url]) => readTransferInfo(sep, url, fetch)));
  const servers = probes.map((p) => p.server);
  const failed = servers.filter((s) => !s.ok);
  const status = (failed[0] ?? servers[0])?.status ?? null;
  const error = failed.length > 0 ? failed.map((s) => `${s.sep}: ${s.error}`).join('; ') : null;
  return {
    record: stageRecord('info', failed.length === 0, status, elapsed(), error),
    servers,
    probes,
  };
};
