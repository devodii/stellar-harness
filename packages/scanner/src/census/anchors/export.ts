import type { AnchorsSummary, Severity } from '../../schema';
import { tomlUrlFor } from '../../stellar/anchors';
import type { AnchorDomain } from './schemas';

export const ANCHORS_FAILING_CSV = 'anchors_failing.csv';
export const ANCHORS_FUNNEL_CSV = 'anchors_funnel.csv';

export const ANCHORS_FAILING_COLUMNS = [
  'domain',
  'name',
  'country',
  'region',
  'stage_failed',
  'scf_round',
  'toml_url',
  'evidence_summary',
] as const;
export type AnchorsFailingRow = Record<(typeof ANCHORS_FAILING_COLUMNS)[number], string>;

export const ANCHORS_FUNNEL_COLUMNS = ['step', 'domains', 'pct_of_tested'] as const;
export type AnchorsFunnelRow = Record<(typeof ANCHORS_FUNNEL_COLUMNS)[number], string>;

export type ExportFinding = {
  type: string;
  subject: string;
  severity: Severity;
  evidence: Record<string, unknown>;
};

const detail = (evidence: Record<string, unknown>): string | null => {
  const value = evidence.error ?? evidence.status;
  return typeof value === 'string' || typeof value === 'number' ? String(value) : null;
};

export const evidenceSummary = (findings: ExportFinding[]): string =>
  findings
    .filter((f) => f.severity !== 'info')
    .map((f) => {
      const text = detail(f.evidence);
      return text ? `${f.type} (${text})` : f.type;
    })
    .join('; ');

export const anchorsFailingRows = (
  summary: AnchorsSummary,
  domains: AnchorDomain[],
  findings: ExportFinding[],
): AnchorsFailingRow[] => {
  const meta = new Map(domains.map((d) => [d.domain, d]));
  const byDomain = new Map<string, ExportFinding[]>();
  for (const finding of findings) {
    byDomain.set(finding.subject, [...(byDomain.get(finding.subject) ?? []), finding]);
  }
  return summary.failing.map((failing) => {
    const domain = meta.get(failing.domain);
    return {
      domain: failing.domain,
      name: domain?.name ?? '',
      country: failing.country ?? '',
      region: domain?.regions.join(';') ?? failing.region ?? '',
      stage_failed: failing.stage,
      scf_round: domain?.scfRounds.join(';') ?? '',
      toml_url: domain?.tomlUrl ?? tomlUrlFor(failing.domain),
      evidence_summary: evidenceSummary(byDomain.get(failing.domain) ?? []),
    };
  });
};

const pct = (count: number, total: number): string =>
  total === 0 ? '0.0' : ((count / total) * 100).toFixed(1);

export const anchorsFunnelRows = (summary: AnchorsSummary): AnchorsFunnelRow[] => {
  const total = summary.domainsTested;
  return [['domainsTested', total] as const, ...Object.entries(summary.funnel)].map(
    ([step, count]) => ({
      step,
      domains: String(count),
      pct_of_tested: pct(count, total),
    }),
  );
};
