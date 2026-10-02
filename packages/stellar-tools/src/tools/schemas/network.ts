import { Network } from '@harness/schema';
import { z } from 'zod';
import { IsoTime, LedgerSeq } from './common';

export const GetNetworkStatusInput = z.object({});
export type GetNetworkStatusInput = z.infer<typeof GetNetworkStatusInput>;

export const GetNetworkStatusOutput = z.object({
  network: Network,
  latestLedger: LedgerSeq,
  closedAt: IsoTime.nullable(),
  protocolVersion: z.number().int().nonnegative(),
  rpc: z.object({
    status: z.string(),
    oldestLedger: LedgerSeq,
    retentionLedgers: z.number().int().nonnegative(),
  }),
  horizon: z.object({
    ok: z.boolean(),
    latestLedger: LedgerSeq.nullable(),
    lagLedgers: z.number().int().nullable(),
  }),
});
export type GetNetworkStatusOutput = z.infer<typeof GetNetworkStatusOutput>;
