import { type Finding, type FindingQuery, severityRank } from '@harness/schema';
import type { FindingPage } from './storage';

export const DEFAULT_LIMIT = 50;

const matches = (finding: Finding, query: FindingQuery): boolean => {
  if (query.type?.length && !query.type.includes(finding.type)) return false;
  if (query.severity?.length && !query.severity.includes(finding.severity)) return false;
  if (query.subject && finding.subject !== query.subject) return false;
  if (query.tags?.length && !query.tags.every((tag) => finding.tags.includes(tag))) return false;
  return true;
};

export const bySeverityThenSubject = (a: Finding, b: Finding): number =>
  severityRank(a.severity) - severityRank(b.severity) || a.subject.localeCompare(b.subject);

export const queryFindingRows = (rows: Iterable<Finding>, query: FindingQuery): FindingPage => {
  const matched = [...rows]
    .filter((finding) => matches(finding, query))
    .sort(bySeverityThenSubject);
  const offset = query.offset ?? 0;
  const limit = query.limit ?? DEFAULT_LIMIT;
  return { rows: matched.slice(offset, offset + limit), total: matched.length };
};
