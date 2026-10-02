import { Finding, FindingQuery, Summary } from '@harness/schema';
import { z } from 'zod';

export const QueryFindingsInput = FindingQuery;
export type QueryFindingsInput = z.infer<typeof QueryFindingsInput>;

export const QueryFindingsOutput = z.object({
  rows: z.array(Finding),
  total: z.number().int().nonnegative(),
});
export type QueryFindingsOutput = z.infer<typeof QueryFindingsOutput>;

export const GetSummaryInput = z.object({});
export type GetSummaryInput = z.infer<typeof GetSummaryInput>;

export const GetSummaryOutput = Summary;
export type GetSummaryOutput = z.infer<typeof GetSummaryOutput>;
