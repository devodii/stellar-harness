import 'server-only';
import { appError } from '@harness/schema';
import { z } from 'zod';
import { fetchUpstream } from './upstream';

const LedgersPage = z.object({
  _embedded: z.object({
    records: z.array(z.object({ sequence: z.number().int(), closed_at: z.iso.datetime() })),
  }),
});

export interface LatestLedger {
  sequence: number;
  closedAt: string;
}

export const fetchLatestLedger = async (horizonUrl: string): Promise<LatestLedger> => {
  const url = new URL('/ledgers', horizonUrl);
  url.searchParams.set('order', 'desc');
  url.searchParams.set('limit', '1');
  const page = LedgersPage.parse(await fetchUpstream('Horizon ledgers', url));
  const record = page._embedded.records[0];
  if (!record) throw appError('UPSTREAM_FAILED', 'Horizon returned no ledgers');
  return { sequence: record.sequence, closedAt: record.closed_at };
};
