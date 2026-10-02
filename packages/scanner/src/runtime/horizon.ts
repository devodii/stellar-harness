import type { HorizonPort, NetworkClients } from '@harness/stellar-tools';
import { appError, err } from '../schema';

export const HORIZON_PROBE_TIMEOUT_MS = 10_000;
const HORIZON_PROBE_ATTEMPTS = 2;

export type HorizonStatus = { available: true } | { available: false; note: string };

export const probeHorizon = async ({
  http,
  config,
}: Pick<NetworkClients, 'http' | 'config'>): Promise<HorizonStatus> => {
  const response = await http.request({
    url: config.HORIZON_URL,
    cache: false,
    timeoutMs: HORIZON_PROBE_TIMEOUT_MS,
    maxAttempts: HORIZON_PROBE_ATTEMPTS,
  });
  if (response.ok && response.value.status < 500) return { available: true };
  const reason = response.ok ? `HTTP ${response.value.status}` : response.error.message;
  return {
    available: false,
    note: `Horizon (${config.HORIZON_URL}) was unavailable at scan start (${reason}); account reads used RPC ledger entries and first-operation lookups were skipped.`,
  };
};

export const unavailableHorizon = (note: string): HorizonPort => {
  const failure = () => Promise.resolve(err(appError('UPSTREAM_FAILED', note)));
  return { account: failure, firstOperation: failure };
};
