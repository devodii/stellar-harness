import type { Summary } from '@harness/schema';

export type ExportPreview = {
  name: string;
  path: string;
  columns: readonly string[];
  rowCount: number;
  rows: readonly Record<string, string | number | null>[];
};

export type MethodEntry = {
  census: string;
  endpoints: readonly string[];
  parameters: Readonly<Record<string, string | number>>;
  notes: readonly string[];
};

export type CensusRun = {
  census: string;
  wallMs: number;
  requests: number;
  networkCalls: number;
  cachedHits: number;
  gaps: number;
  skipped?: string;
};

export type ReportInputs = {
  summary: Summary;
  exports: readonly ExportPreview[];
  methodology: readonly MethodEntry[];
  runs: readonly CensusRun[];
};
