import type { AnchorStage } from '@harness/schema';
import type { StageRecord } from './schemas';

export const SKIPPED_PREFIX = 'skipped: ';

export const SKIP_REASONS = {
  tomlUnreachable: 'toml_unreachable',
  testnetToml: 'testnet_toml',
  mainnetToml: 'mainnet_toml',
  noSepEndpoints: 'no_sep_endpoints',
  noAccounts: 'no_accounts',
  notApplicable: 'not_applicable',
  notRequested: 'not_requested',
  testsUnavailable: 'anchor_tests_unavailable',
} as const;
export type SkipReason = (typeof SKIP_REASONS)[keyof typeof SKIP_REASONS];

export const stageRecord = (
  stage: AnchorStage,
  ok: boolean,
  status: number | null,
  ms: number,
  error: string | null = null,
): StageRecord => ({ stage, ok, status, ms: Math.max(0, Math.round(ms)), error });

export const skippedStage = (stage: AnchorStage, reason: SkipReason): StageRecord =>
  stageRecord(stage, false, null, 0, `${SKIPPED_PREFIX}${reason}`);

export const isSkipped = (record: Pick<StageRecord, 'error'>): boolean =>
  record.error?.startsWith(SKIPPED_PREFIX) ?? false;

export const skipReason = (record: Pick<StageRecord, 'error'>): string | null =>
  isSkipped(record) ? (record.error?.slice(SKIPPED_PREFIX.length) ?? null) : null;

export const isFailed = (record: Pick<StageRecord, 'ok' | 'error'>): boolean =>
  !record.ok && !isSkipped(record);

export const startTimer = (now: () => number = () => performance.now()): (() => number) => {
  const started = now();
  return () => now() - started;
};
