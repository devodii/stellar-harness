import { ok } from '@harness/schema';
import { apiHandler } from '@/lib/api-handler';
import { WaitlistBody, type WaitlistResponse } from '@/lib/api-schemas';
import { logger } from '@/lib/log';
import { getStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const USER_AGENT_LIMIT = 512;

export const POST = apiHandler({
  name: 'waitlist.join',
  schema: { body: WaitlistBody },
  rateLimit: { limit: 5, windowSeconds: 600 },
  handler: async ({ body, req, requestId }) => {
    const storage = getStorage('mainnet');
    await storage.putWaitlist({
      email: body.email,
      createdAt: new Date().toISOString(),
      userAgent: (req.headers.get('user-agent') ?? '').slice(0, USER_AGENT_LIMIT),
    });
    const response: WaitlistResponse = { count: await storage.countWaitlist() };
    logger.info({ requestId, count: response.count }, 'pilot request stored');
    return ok(response);
  },
});
