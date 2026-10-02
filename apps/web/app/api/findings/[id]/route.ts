import { appError, err, ok } from '@harness/schema';
import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { getRequestNetwork } from '@/lib/network';
import { getStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export const GET = apiHandler({
  name: 'findings.get',
  schema: { params: z.object({ id: z.string().regex(/^[0-9a-f]{64}$/, 'Invalid finding id') }) },
  rateLimit: { limit: 120, windowSeconds: 60 },
  handler: async ({ params }) => {
    const finding = await getStorage(await getRequestNetwork()).getFinding(params.id);
    return finding ? ok(finding) : err(appError('NOT_FOUND', `Finding ${params.id} not found`));
  },
});
