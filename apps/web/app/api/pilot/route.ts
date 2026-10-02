import { ok } from '@harness/schema';
import { addPilotRequest } from '@harness/storage/pilot';
import { apiHandler } from '@/lib/api-handler';
import { PilotBody } from '@/lib/api-schemas';
import { db } from '@/lib/db';

export const POST = apiHandler({
  name: 'pilot.request',
  schema: { body: PilotBody },
  rateLimit: { limit: 5, windowSeconds: 600 },
  handler: async ({ body, req }) => {
    const count = await addPilotRequest(await db(), {
      email: body.email.trim(),
      userAgent: req.headers.get('user-agent')?.slice(0, 512) ?? '',
    });
    return ok({ count });
  },
});
