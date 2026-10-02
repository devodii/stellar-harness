import 'server-only';
import { appError } from '@harness/schema';
import { z } from 'zod';

const LedgersPage = z.object({
  _embedded: z.object({
    records: z.array(z.object({ sequence: z.number().int(), closed_at: z.iso.datetime() })),
  }),
});

export interface LatestLedger {
  sequence: number;
  closedAt: string;
}

const TIMEOUT_MS = 5000;

export const fetchLatestLedger = async (horizonUrl: string): Promise<LatestLedger> => {
  const url = new URL('/ledgers', horizonUrl);
  url.searchParams.set('order', 'desc');
  url.searchParams.set('limit', '1');

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    throw appError(
      timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_FAILED',
      `Horizon ledgers request failed: ${error instanceof Error ? error.message : 'unknown'}`,
    );
  }
  if (!response.ok) {
    throw appError('UPSTREAM_FAILED', `Horizon ledgers returned ${response.status}`, {
      status: response.status,
    });
  }
  const record = LedgersPage.parse(await response.json())._embedded.records[0];
  if (!record) throw appError('UPSTREAM_FAILED', 'Horizon returned no ledgers');
  return { sequence: record.sequence, closedAt: record.closed_at };
};
