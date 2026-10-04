import type { ReportFileInfo } from '@harness/storage/report';

export type CsvRow = Record<string, string>;

export type ReportSummary = {
  snapshot: { snapshotLedger: number; snapshotTime: string; ledgerCloseSeconds: number };
  contracts: {
    total: number;
    archivedInstances: number;
    expiring30d: number;
    archivedMeaningful?: number;
    expiring30dMeaningful?: number;
  };
  failures: {
    windowStart: string;
    windowEnd: string;
    txScanned: number;
    txFailed: number;
    preventable: { total: number };
  };
  anchors: {
    domainsTested: number;
    failing: unknown[];
    perSep: Record<string, { tested: number; passed: number }>;
  };
  rent: {
    contractsEstimated: number;
    totalXlm12m: number;
    medianXlm12m: number;
    xlmUsd: { price: number; source: string; at: string } | null;
  };
};

export const REPORT_CSVS = [
  'failed_tx_by_code.csv',
  'failure_clusters.csv',
  'contracts_archived_meaningful.csv',
  'contracts_expiring_30d.csv',
  'anchors_funnel.csv',
  'anchors_failing.csv',
  'rent_top100.csv',
] as const;
type ReportCsv = (typeof REPORT_CSVS)[number];

export type Report = {
  summary: ReportSummary;
  files: ReportFileInfo[];
  csv: Record<ReportCsv, CsvRow[]>;
};

const MEANINGFUL_INVOCATIONS = 100;

export const isActive = (row: CsvRow): boolean =>
  Number(row.invocations) >= MEANINGFUL_INVOCATIONS || row.scf_slug !== '';
