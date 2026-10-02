import { ok } from '@harness/schema';
import { apiHandler } from '@/lib/api-handler';
import { readSummary } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export const GET = apiHandler({
  name: 'summary.get',
  mcp: { name: 'get_summary', description: 'Scan summary, or an empty summary before any scan.' },
  rateLimit: { limit: 120, windowSeconds: 60 },
  handler: async () => ok(await readSummary()),
});
