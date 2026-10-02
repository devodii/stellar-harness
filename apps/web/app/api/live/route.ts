import { type Network, ok } from '@harness/schema';
import { getNetworkConfig } from '@/lib/agent';
import { apiHandler } from '@/lib/api-handler';
import type { SummaryResponse } from '@/lib/api-schemas';
import { fetchLatestLedger } from '@/lib/horizon';
import { type LedgerReading, readLatestLedger } from '@/lib/latest-ledger';
import { buildLive } from '@/lib/live';
import { logger } from '@/lib/log';
import { memoBy, ttlCache } from '@/lib/memo';
import { getRequestNetwork } from '@/lib/network';
import { fetchRpcLatestLedger } from '@/lib/rpc';
import { readSummary } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const LEDGER_TTL_MS = 5_000;
const SUMMARY_TTL_MS = 30_000;

const ledgerCache = memoBy((_network: Network) => ttlCache<LedgerReading | null>(LEDGER_TTL_MS));
const summaryCache = memoBy((_network: Network) => ttlCache<SummaryResponse>(SUMMARY_TTL_MS));

const latestLedger = (network: Network) => {
  const config = getNetworkConfig(network);
  return ledgerCache(network).get(() =>
    readLatestLedger(
      {
        horizon: () => fetchLatestLedger(config.HORIZON_URL),
        rpc: () => fetchRpcLatestLedger(config.RPC_URL),
      },
      (source, error) => logger.warn({ network, source, error }, 'latest ledger unavailable'),
    ),
  );
};

export const GET = apiHandler({
  name: 'live.get',
  rateLimit: { limit: 240, windowSeconds: 60 },
  handler: async () => {
    const network = await getRequestNetwork();
    const [ledger, summary] = await Promise.all([
      latestLedger(network),
      summaryCache(network).get(() => readSummary(network)),
    ]);
    return ok(buildLive(network, ledger, summary));
  },
});
