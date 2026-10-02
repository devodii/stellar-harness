import type { Finding, FindingQuery, Snapshot, Summary } from '@harness/schema';

export type FindingPage = { rows: Finding[]; total: number };

export interface Storage {
  putFindings(findings: Finding[]): Promise<void>;
  queryFindings(query: FindingQuery): Promise<FindingPage>;
  getFinding(findingId: string): Promise<Finding | null>;
  getSummary(): Promise<Summary | null>;
  putSummary(summary: Summary): Promise<void>;
  getSnapshot(): Promise<Snapshot | null>;
}
