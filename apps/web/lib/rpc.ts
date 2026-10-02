import 'server-only';
import { appError } from '@harness/schema';
import { z } from 'zod';
import type { LatestLedger } from './horizon';
import { fetchUpstream } from './upstream';

const LatestLedgerReply = z.union([
  z.object({
    result: z.object({
      sequence: z.number().int(),
      closeTime: z.string().regex(/^\d+$/).optional(),
    }),
  }),
  z.object({ error: z.object({ code: z.number(), message: z.string() }) }),
]);

export const fetchRpcLatestLedger = async (rpcUrl: string): Promise<LatestLedger> => {
  const reply = LatestLedgerReply.parse(
    await fetchUpstream('RPC getLatestLedger', rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getLatestLedger' }),
    }),
  );
  if ('error' in reply) {
    throw appError('UPSTREAM_FAILED', `RPC getLatestLedger failed: ${reply.error.message}`);
  }
  const { sequence, closeTime } = reply.result;
  return {
    sequence,
    closedAt: closeTime ? new Date(Number(closeTime) * 1000).toISOString() : null,
  };
};
