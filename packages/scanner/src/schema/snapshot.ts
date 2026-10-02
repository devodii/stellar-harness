import { Network } from '@harness/schema';
import { z } from 'zod';

export const Snapshot = z.object({
  snapshotLedger: z.number().int().positive(),
  snapshotTime: z.iso.datetime(),
  ledgerCloseSeconds: z.number().positive(),
  gitSha: z.string(),
  network: Network,
});
export type Snapshot = z.infer<typeof Snapshot>;
