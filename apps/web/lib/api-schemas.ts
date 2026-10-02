import { Finding, FindingType, Network, Severity, Summary, WaitlistEntry } from '@harness/schema';
import { z } from 'zod';
import { LEDGER_SOURCES } from './latest-ledger';

const listOf = <T extends z.ZodType>(item: T) =>
  z
    .union([item, z.array(item)])
    .optional()
    .transform((value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    );

const blankToUndefined = (value: unknown) => (value === '' ? undefined : value);

export const FINDINGS_PAGE_SIZE = 25;

export const FindingsQueryParams = z.object({
  type: listOf(FindingType),
  severity: listOf(Severity),
  tag: listOf(z.string().min(1)),
  subject: z.preprocess(blankToUndefined, z.string().min(1).optional()),
  limit: z.coerce.number().int().positive().max(200).default(FINDINGS_PAGE_SIZE),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type FindingsQueryParams = z.infer<typeof FindingsQueryParams>;

export const FindingsResponse = z.object({
  rows: z.array(Finding),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});
export type FindingsResponse = z.infer<typeof FindingsResponse>;

export const SummaryResponse = z.object({ summary: Summary, scanned: z.boolean() });
export type SummaryResponse = z.infer<typeof SummaryResponse>;

export const LiveResponse = z.object({
  network: Network,
  latestLedger: z.number().int().nullable(),
  closedAt: z.iso.datetime().nullable(),
  ledgerSource: z.enum(LEDGER_SOURCES).nullable(),
  ledgerCloseSeconds: z.number().positive().nullable(),
  window: z.object({
    days: z.number().int().nonnegative(),
    txFailed: z.number().int().nonnegative().nullable(),
    preventable: z.number().int().nonnegative().nullable(),
    preventableShare: z.number().min(0).max(1).nullable(),
  }),
  archivedContracts: z.number().int().nonnegative().nullable(),
  archivedMeaningful: z.number().int().nonnegative().nullable(),
  anchorsFailing: z.number().int().nonnegative().nullable(),
  scanned: z.boolean(),
  horizonOk: z.boolean(),
});
export type LiveResponse = z.infer<typeof LiveResponse>;

export const NetworkBody = z.object({ network: Network });
export type NetworkBody = z.infer<typeof NetworkBody>;

export const WaitlistBody = WaitlistEntry.pick({ email: true });
export type WaitlistBody = z.infer<typeof WaitlistBody>;

export const WaitlistResponse = z.object({ count: z.number().int().nonnegative() });
export type WaitlistResponse = z.infer<typeof WaitlistResponse>;

export const ApiErrorBody = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
