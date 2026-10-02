import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { NetworkBody } from '@/lib/api-schemas';
import { logger } from '@/lib/log';
import { networkCookie } from '@/lib/network-cookie';

export const dynamic = 'force-dynamic';

export const POST = apiHandler({
  name: 'network.set',
  schema: { body: NetworkBody },
  rateLimit: { limit: 30, windowSeconds: 60 },
  handler: ({ body, requestId }) => {
    logger.info({ requestId, network: body.network }, 'network selected');
    const response = NextResponse.json(
      { network: body.network },
      { headers: { 'cache-control': 'no-store' } },
    );
    response.cookies.set(networkCookie(body.network));
    return response;
  },
});
