import { type AnchorTestsReport, isFailed, isSkipped } from '@harness/stellar-tools/anchors';
import type { AnchorsSummary, FailingAnchor } from '../../schema';
import { ANCHOR_STAGES, type AnchorStage } from '../../schema';
import type { AnchorDomain, AnchorProbeRow } from './schemas';

export type FindingRef = { type: string; subject: string };

export type FunnelInput = {
  domains: AnchorDomain[];
  rows: AnchorProbeRow[];
  findings: FindingRef[];
  tests?: AnchorTestsReport[];
};

export type DomainStages = Map<AnchorStage, AnchorProbeRow>;

export const latestStages = (rows: AnchorProbeRow[]): Map<string, DomainStages> => {
  const byDomain = new Map<string, DomainStages>();
  for (const row of rows) {
    const stages = byDomain.get(row.domain) ?? new Map();
    stages.set(row.stage, row);
    byDomain.set(row.domain, stages);
  }
  return byDomain;
};

export const firstFailedStage = (stages: DomainStages): AnchorStage | null =>
  ANCHOR_STAGES.find((stage) => {
    const row = stages.get(stage);
    return row !== undefined && isFailed(row);
  }) ?? null;

const passed = (stages: DomainStages, stage: AnchorStage): boolean =>
  stages.get(stage)?.ok === true;

const notFailed = (stages: DomainStages, stage: AnchorStage): boolean => {
  const row = stages.get(stage);
  return row !== undefined && (row.ok || isSkipped(row));
};

export const PROBE_SEP_KEYS: Partial<Record<AnchorStage, string>> = {
  toml: 'sep1',
  info: 'sep6_24',
  sep10: 'sep10',
  sep31: 'sep31',
  sep38: 'sep38',
};

const perSepCounts = (
  stagesByDomain: Map<string, DomainStages>,
  tests: AnchorTestsReport[],
): AnchorsSummary['perSep'] => {
  const perSep: AnchorsSummary['perSep'] = {};
  const bump = (key: string, ok: boolean) => {
    const entry = perSep[key] ?? { tested: 0, passed: 0 };
    entry.tested += 1;
    if (ok) entry.passed += 1;
    perSep[key] = entry;
  };
  for (const stages of stagesByDomain.values()) {
    for (const [stage, key] of Object.entries(PROBE_SEP_KEYS) as [AnchorStage, string][]) {
      const row = stages.get(stage);
      if (row && !isSkipped(row)) bump(key, row.ok);
    }
  }
  for (const report of tests) {
    for (const [sep, result] of Object.entries(report.perSep)) {
      bump(`tests:sep${sep}`, result.failed === 0);
    }
  }
  return perSep;
};

const failingAnchor = (
  domain: string,
  stage: AnchorStage,
  meta: AnchorDomain | undefined,
): FailingAnchor => {
  const rounds = meta?.scfRounds ?? [];
  return {
    domain,
    country: meta?.country ?? null,
    region: meta?.regions[0] ?? null,
    stage,
    ...(rounds.length > 0 ? { scfRound: Math.max(...rounds) } : {}),
  };
};

export const computeAnchorsSummary = ({
  domains,
  rows,
  findings,
  tests = [],
}: FunnelInput): AnchorsSummary => {
  const stagesByDomain = latestStages(rows);
  const meta = new Map(domains.map((d) => [d.domain, d]));
  const missingKey = new Set(
    findings.filter((f) => f.type === 'ANCHOR_TOML_MISSING_SIGNING_KEY').map((f) => f.subject),
  );
  const funnel = {
    tomlReachable: 0,
    signingKey: 0,
    endpoints: 0,
    infoReadable: 0,
    sep10: 0,
    testsPassed: 0,
  };
  const failing: FailingAnchor[] = [];
  for (const [domain, stages] of stagesByDomain) {
    const steps = [
      passed(stages, 'toml'),
      !missingKey.has(domain),
      passed(stages, 'endpoints'),
      notFailed(stages, 'info'),
      passed(stages, 'sep10'),
      passed(stages, 'tests'),
    ];
    const reached = steps.findIndex((ok) => !ok);
    const depth = reached === -1 ? steps.length : reached;
    const keys = Object.keys(funnel) as (keyof typeof funnel)[];
    for (const key of keys.slice(0, depth)) funnel[key] += 1;
    const stage = firstFailedStage(stages);
    if (stage) failing.push(failingAnchor(domain, stage, meta.get(domain)));
  }
  failing.sort(
    (a, b) =>
      ANCHOR_STAGES.indexOf(a.stage) - ANCHOR_STAGES.indexOf(b.stage) ||
      a.domain.localeCompare(b.domain),
  );
  return {
    domainsTested: stagesByDomain.size,
    funnel,
    perSep: perSepCounts(stagesByDomain, tests),
    failing,
  };
};
