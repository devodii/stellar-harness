import { ok } from '@harness/schema';
import { apiHandler } from '@/lib/api-handler';
import { FindingsQueryParams, type FindingsResponse } from '@/lib/api-schemas';
import { getRequestNetwork } from '@/lib/network';
import { getStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export const GET = apiHandler({
  name: 'findings.list',
  mcp: {
    name: 'query_findings',
    description: 'Filter scan findings by type, severity, tag and whether they matter.',
  },
  schema: { query: FindingsQueryParams },
  rateLimit: { limit: 120, windowSeconds: 60 },
  handler: async ({ query }) => {
    const page = await getStorage(await getRequestNetwork()).queryFindings({
      type: query.type,
      severity: query.severity,
      tags: query.tag,
      subject: query.subject,
      meaningful: query.meaningful,
      limit: query.limit,
      offset: query.offset,
    });
    const response: FindingsResponse = { ...page, limit: query.limit, offset: query.offset };
    return ok(response);
  },
});
