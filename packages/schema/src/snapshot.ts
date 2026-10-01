import { z } from 'zod';

export const Network = z.enum(['mainnet']);
export type Network = z.infer<typeof Network>;

export const Snapshot = z.object({
  snapshotLedger: z.number().int().positive(),
  snapshotTime: z.iso.datetime(),
  ledgerCloseSeconds: z.number().positive(),
  gitSha: z.string(),
  network: Network,
});
export type Snapshot = z.infer<typeof Snapshot>;
