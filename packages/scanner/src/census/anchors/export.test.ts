import type { AnchorsSummary } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { mergeCandidates } from './domains';
import {
  ANCHORS_FAILING_COLUMNS,
  ANCHORS_FUNNEL_COLUMNS,
  anchorsFailingRows,
  anchorsFunnelRows,
  evidenceSummary,
} from './export';

const summary: AnchorsSummary = {
  domainsTested: 4,
  funnel: {
    tomlReachable: 3,
    signingKey: 2,
    endpoints: 2,
    infoReadable: 2,
    sep10: 1,
    testsPassed: 0,
  },
  perSep: {},
  failing: [
    { domain: 'gone.example', country: null, region: null, stage: 'toml' },
    { domain: 'clpx.finance', country: 'CL', region: 'latam', stage: 'sep10', scfRound: 44 },
  ],
};

const domains = mergeCandidates([
  {
    domain: 'clpx.finance',
    source: 'stellarlight_partner',
    name: 'CLPX',
    country: 'Chile',
    regions: ['latam', 'global'],
    scfRounds: [41, 44],
  },
]);

const findings = [
  {
    type: 'ANCHOR_SEP10_CHALLENGE_FAILS',
    subject: 'clpx.finance',
    severity: 'high' as const,
    evidence: { error: 'challenge_checks_failed: homeDomainMatches' },
  },
  {
    type: 'ANCHOR_ISSUER_FLAGS',
    subject: 'clpx.finance',
    severity: 'info' as const,
    evidence: {},
  },
  {
    type: 'ANCHOR_TLS_OR_CORS_BROKEN',
    subject: 'clpx.finance',
    severity: 'medium' as const,
    evidence: { checks: [] },
  },
  {
    type: 'ANCHOR_TOML_UNREACHABLE',
    subject: 'gone.example',
    severity: 'critical' as const,
    evidence: { status: 404, error: 'http_404' },
  },
];

describe('anchorsFailingRows', () => {
  it('produces one row per failing anchor with the export columns', () => {
    const rows = anchorsFailingRows(summary, domains, findings);
    expect(rows.map((r) => Object.keys(r))).toEqual([
      [...ANCHORS_FAILING_COLUMNS],
      [...ANCHORS_FAILING_COLUMNS],
    ]);
    expect(rows).toEqual([
      {
        domain: 'gone.example',
        name: '',
        country: '',
        region: '',
        stage_failed: 'toml',
        scf_round: '',
        toml_url: 'https://gone.example/.well-known/stellar.toml',
        evidence_summary: 'ANCHOR_TOML_UNREACHABLE (http_404)',
      },
      {
        domain: 'clpx.finance',
        name: 'CLPX',
        country: 'CL',
        region: 'global;latam',
        stage_failed: 'sep10',
        scf_round: '41;44',
        toml_url: 'https://clpx.finance/.well-known/stellar.toml',
        evidence_summary:
          'ANCHOR_SEP10_CHALLENGE_FAILS (challenge_checks_failed: homeDomainMatches); ANCHOR_TLS_OR_CORS_BROKEN',
      },
    ]);
  });

  it('leaves out info findings from the evidence summary', () => {
    expect(evidenceSummary([findings[1] as (typeof findings)[number]])).toBe('');
  });
});

describe('anchorsFunnelRows', () => {
  it('lists each funnel step with its share of tested domains', () => {
    const rows = anchorsFunnelRows(summary);
    expect(Object.keys(rows[0] ?? {})).toEqual([...ANCHORS_FUNNEL_COLUMNS]);
    expect(rows.map((r) => [r.step, r.domains, r.pct_of_tested])).toEqual([
      ['domainsTested', '4', '100.0'],
      ['tomlReachable', '3', '75.0'],
      ['signingKey', '2', '50.0'],
      ['endpoints', '2', '50.0'],
      ['infoReadable', '2', '50.0'],
      ['sep10', '1', '25.0'],
      ['testsPassed', '0', '0.0'],
    ]);
  });

  it('handles an empty census', () => {
    const empty = { ...summary, domainsTested: 0 };
    expect(anchorsFunnelRows(empty)[0]?.pct_of_tested).toBe('0.0');
  });
});
