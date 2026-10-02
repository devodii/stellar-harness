import type { Finding } from '@harness/schema';
import { type Sql, toJson } from './sql';

export const findingRow = (network: string, finding: Finding) => ({
  network,
  finding_id: finding.findingId,
  type: finding.type,
  severity: finding.severity,
  subject: finding.subject,
  subject_kind: finding.subjectKind,
  tags: finding.tags,
  snapshot_ledger: finding.snapshotLedger,
  body: toJson(finding),
});

export const FINDING_COLUMNS = [
  'network',
  'finding_id',
  'type',
  'severity',
  'subject',
  'subject_kind',
  'tags',
  'snapshot_ledger',
  'body',
] as const;

export const insertFindings = async (
  sql: Sql,
  network: string,
  findings: readonly Finding[],
): Promise<number> => {
  if (findings.length === 0) return 0;
  const rows = findings.map((finding) => findingRow(network, finding));
  const result = await sql`
    insert into findings ${sql(rows, ...FINDING_COLUMNS)}
    on conflict (network, finding_id) do nothing
  `;
  return result.count;
};
