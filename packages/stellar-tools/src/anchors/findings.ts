import type { AnchorStage, FindingType, Severity } from '@harness/schema';
import { homeDomainMismatches } from './accounts';
import { brokenCors } from './cors';
import type { AnchorProbeResult, FindingDraft, StageRecord } from './schemas';
import { isFailed } from './stage';
import { issuers } from './toml';

export const ANCHOR_FINDING_SEVERITY = {
  ANCHOR_TOML_UNREACHABLE: 'critical',
  ANCHOR_TOML_MISSING_SIGNING_KEY: 'high',
  ANCHOR_TOML_NO_ACCOUNTS: 'medium',
  ANCHOR_HOME_DOMAIN_MISMATCH: 'medium',
  ANCHOR_ISSUER_FLAGS: 'info',
  ANCHOR_NO_SEP_ENDPOINTS: 'high',
  ANCHOR_INFO_UNREADABLE: 'critical',
  ANCHOR_SEP10_CHALLENGE_FAILS: 'high',
  ANCHOR_SEP38_PRICES_FAILS: 'medium',
  ANCHOR_SEP31_INFO_FAILS: 'medium',
  ANCHOR_TLS_OR_CORS_BROKEN: 'medium',
  ANCHOR_TESTS_FAILED: 'high',
} as const satisfies Partial<Record<FindingType, Severity>>;

export type AnchorFindingType = keyof typeof ANCHOR_FINDING_SEVERITY;

export const ANCHOR_FINDING_STAGE: Record<AnchorFindingType, AnchorStage> = {
  ANCHOR_TOML_UNREACHABLE: 'toml',
  ANCHOR_TOML_MISSING_SIGNING_KEY: 'toml',
  ANCHOR_TOML_NO_ACCOUNTS: 'toml',
  ANCHOR_HOME_DOMAIN_MISMATCH: 'accounts',
  ANCHOR_ISSUER_FLAGS: 'accounts',
  ANCHOR_NO_SEP_ENDPOINTS: 'endpoints',
  ANCHOR_INFO_UNREADABLE: 'info',
  ANCHOR_SEP10_CHALLENGE_FAILS: 'sep10',
  ANCHOR_SEP38_PRICES_FAILS: 'sep38',
  ANCHOR_SEP31_INFO_FAILS: 'sep31',
  ANCHOR_TLS_OR_CORS_BROKEN: 'cors',
  ANCHOR_TESTS_FAILED: 'tests',
};

export type ProbeState = Omit<AnchorProbeResult, 'findings'>;

const stageOf = (state: ProbeState, stage: AnchorStage): StageRecord | undefined =>
  state.stages.find((r) => r.stage === stage);

const failed = (state: ProbeState, stage: AnchorStage): StageRecord | null => {
  const record = stageOf(state, stage);
  return record && isFailed(record) ? record : null;
};

const unique = (tags: string[]): string[] => [...new Set(tags)];

const FLAG_NAMES = [
  'auth_required',
  'auth_revocable',
  'auth_clawback_enabled',
  'auth_immutable',
] as const;

const anyFlags = (
  issuers: Record<(typeof FLAG_NAMES)[number], boolean>[],
): Record<(typeof FLAG_NAMES)[number], boolean> =>
  Object.fromEntries(FLAG_NAMES.map((flag) => [flag, issuers.some((i) => i[flag])])) as Record<
    (typeof FLAG_NAMES)[number],
    boolean
  >;

export const anchorFindings = (state: ProbeState, extraTags: string[] = []): FindingDraft[] => {
  const { domain, tomlUrl, toml, details } = state;
  const tags = unique(['anchor', ...state.tags, ...extraTags]);
  const draft = (type: AnchorFindingType, evidence: Record<string, unknown>): FindingDraft => ({
    type,
    subjectKind: 'anchor_domain',
    subject: domain,
    severity: ANCHOR_FINDING_SEVERITY[type],
    evidence: { domain, ...evidence },
    tags,
  });

  const tomlFailure = failed(state, 'toml');
  if (tomlFailure || !toml) {
    return [
      draft('ANCHOR_TOML_UNREACHABLE', {
        url: tomlUrl,
        status: tomlFailure?.status ?? null,
        error: tomlFailure?.error ?? 'toml_unavailable',
      }),
    ];
  }

  const findings: FindingDraft[] = [];
  if (!toml.signingKey) findings.push(draft('ANCHOR_TOML_MISSING_SIGNING_KEY', { url: tomlUrl }));
  if (toml.accounts.length === 0 && issuers(toml).length === 0) {
    findings.push(
      draft('ANCHOR_TOML_NO_ACCOUNTS', { url: tomlUrl, currencies: toml.currencies.length }),
    );
  }

  const mismatched = homeDomainMismatches(domain, details.accounts);
  if (mismatched[0]) {
    findings.push(
      draft('ANCHOR_HOME_DOMAIN_MISMATCH', {
        account: mismatched[0].id,
        homeDomain: mismatched[0].homeDomain,
        accounts: mismatched.map(({ id, homeDomain, roles, codes }) => ({
          account: id,
          homeDomain,
          roles,
          codes,
        })),
      }),
    );
  }
  const issuerFlags = details.accounts.flatMap(({ id, roles, codes, flags }) =>
    roles.includes('issuer') && flags ? [{ account: id, codes, ...flags }] : [],
  );
  if (issuerFlags[0]) {
    findings.push(
      draft('ANCHOR_ISSUER_FLAGS', {
        issuer: issuerFlags[0].account,
        ...anyFlags(issuerFlags),
        issuers: issuerFlags,
      }),
    );
  }

  if (failed(state, 'endpoints')) {
    findings.push(draft('ANCHOR_NO_SEP_ENDPOINTS', { url: tomlUrl }));
    return findings;
  }

  if (failed(state, 'info')) {
    const servers = details.info
      .filter((s) => !s.ok)
      .map(({ sep, url, status, error }) => ({ sep, url, status, error }));
    findings.push(draft('ANCHOR_INFO_UNREADABLE', { servers }));
  }

  const sep10 = failed(state, 'sep10');
  if (sep10 && details.sep10) {
    const { url, status, error, checks, networkPassphrase } = details.sep10;
    findings.push(
      draft('ANCHOR_SEP10_CHALLENGE_FAILS', { url, status, error, checks, networkPassphrase }),
    );
  }

  for (const [stage, type] of [
    ['sep38', 'ANCHOR_SEP38_PRICES_FAILS'],
    ['sep31', 'ANCHOR_SEP31_INFO_FAILS'],
  ] as const) {
    const endpoint = details[stage];
    if (failed(state, stage) && endpoint) {
      findings.push(
        draft(type, { url: endpoint.url, status: endpoint.status, error: endpoint.error }),
      );
    }
  }

  if (failed(state, 'cors')) {
    findings.push(draft('ANCHOR_TLS_OR_CORS_BROKEN', { checks: brokenCors(details.cors) }));
  }

  if (failed(state, 'tests') && state.anchorTests && !state.anchorTests.error) {
    const { perSep, excludedSeps } = state.anchorTests;
    findings.push(draft('ANCHOR_TESTS_FAILED', { perSep, excludedSeps }));
  }

  return findings;
};
