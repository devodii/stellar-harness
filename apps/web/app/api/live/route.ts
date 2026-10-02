import { DEFAULT_NETWORK, ok } from '@harness/schema';
import { apiHandler } from '@/lib/api-handler';
import type { SummaryResponse } from '@/lib/api-schemas';
import { getServerEnv } from '@/lib/env';
import { fetchLatestLedger, type LatestLedger } from '@/lib/horizon';
import { buildLive } from '@/lib/live';
import { logger } from '@/lib/log';
import { ttlCache } from '@/lib/memo';
import { readSummary } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const LEDGER_TTL_MS = 5_000;
const SUMMARY_TTL_MS = 30_000;

const ledgerCache = ttlCache<LatestLedger | null>(LEDGER_TTL_MS);
const summaryCache = ttlCache<SummaryResponse>(SUMMARY_TTL_MS);

const latestLedger = () =>
  ledgerCache.get(() =>
    fetchLatestLedger(getServerEnv().HORIZON_URL).catch((error: unknown) => {
      logger.warn({ error }, 'horizon latest ledger unavailable');
      return null;
    }),
  );

export const GET = apiHandler({
  name: 'live.get',
  rateLimit: { limit: 240, windowSeconds: 60 },
  cacheControl: 'public, max-age=5, s-maxage=5',
  handler: async () => {
    const [ledger, summary] = await Promise.all([
      latestLedger(),
      summaryCache.get(() => readSummary(DEFAULT_NETWORK)),
    ]);
    return ok(buildLive(ledger, summary));
  },
});
