import { z } from 'zod';

export const CODE_CATEGORIES = [
  'success',
  'sequence',
  'fee',
  'time',
  'auth',
  'balance',
  'reserve',
  'trust',
  'destination',
  'limit',
  'offer',
  'path',
  'options',
  'data',
  'sponsorship',
  'claimable_balance',
  'clawback',
  'liquidity_pool',
  'soroban',
  'malformed',
  'account',
  'internal',
] as const;
export const CodeCategory = z.enum(CODE_CATEGORIES);
export type CodeCategory = z.infer<typeof CodeCategory>;

export const CodeInfo = z.object({
  title: z.string().min(1),
  explanation: z.string().min(1),
  preventable: z.boolean(),
  category: CodeCategory,
});
export type CodeInfo = z.infer<typeof CodeInfo>;

export type CodeEntry = Omit<CodeInfo, 'preventable'>;

export const entry = (category: CodeCategory, title: string, explanation: string): CodeEntry => ({
  category,
  title,
  explanation,
});
