import { describe, expect, it } from 'vitest';
import { ANCHOR_STAGES, type AnchorStage, AnchorsSummary } from '../../schema';
import { mergeCandidates } from './domains';
import { computeAnchorsSummary, firstFailedStage, latestStages } from './funnel';
import type { AnchorProbeRow } from './schemas';

type Outcome = true | false | string;

const rowsFor = (
  domain: string,
  outcomes: Partial<Record<AnchorStage, Outcome>>,
): AnchorProbeRow[] =>
  ANCHOR_STAGES.map((stage) => {
    const outcome = outcomes[stage] ?? 'skipped: not_applicable';
    return {
      domain,
      stage,
      ok: outcome === true,
      status: outcome === true ? 200 : null,
      ms: 1,
      error: outcome === true ? null : outcome === false ? 'http_500' : outcome,
    };
  });

const unreachable = rowsFor('gone.example', {
  toml: false,
  accounts: 'skipped: toml_unreachable',
});
const healthy = rowsFor('ok.example', {
  toml: true,
  accounts: true,
  endpoints: true,
  sep10: true,
  sep31: true,
  cors: true,
  tests: true,
});
const sep10Broken = rowsFor('clpx.finance', {
  toml: true,
  accounts: true,
  endpoints: true,
  info: true,
  sep10: false,
  cors: false,
  tests: 'skipped: not_requested',
});
const noKey = rowsFor('nokey.example', { toml: true, endpoints: false });

const domains = mergeCandidates([
  {
    domain: 'clpx.finance',
    source: 'stellarlight_partner',
    country: 'Chile',
    regions: ['latam'],
    scfRounds: [41, 44],
  },
  { domain: 'gone.example', source: 'stellar_expert_asset' },
]);

describe('computeAnchorsSummary', () => {
  const summary = computeAnchorsSummary({
    domains,
    rows: [...unreachable, ...healthy, ...sep10Broken, ...noKey],
    findings: [{ type: 'ANCHOR_TOML_MISSING_SIGNING_KEY', subject: 'nokey.example' }],
    tests: [
      {
        domain: 'ok.example',
        requestedSeps: [1, 10],
        ranSeps: [1, 10],
        perSep: {
          '1': { passed: 5, failed: 0, skipped: 0, blocked: 0, names: [] },
          '10': { passed: 8, failed: 1, skipped: 0, blocked: 0, names: ['x'] },
        },
        excludedSeps: [],
        excludedTests: [],
        error: null,
      },
    ],
  });

  it('validates against the schema', () => {
    expect(AnchorsSummary.parse(summary)).toEqual(summary);
  });

  it('computes a cumulative funnel', () => {
    expect(summary.domainsTested).toBe(4);
    expect(summary.funnel).toEqual({
      tomlReachable: 3,
      signingKey: 2,
      endpoints: 2,
      infoReadable: 2,
      sep10: 1,
      testsPassed: 1,
    });
  });

  it('counts per sep from probe stages and anchor tests', () => {
    expect(summary.perSep).toEqual({
      sep1: { tested: 4, passed: 3 },
      sep6_24: { tested: 1, passed: 1 },
      sep10: { tested: 2, passed: 1 },
      sep31: { tested: 1, passed: 1 },
      'tests:sep1': { tested: 1, passed: 1 },
      'tests:sep10': { tested: 1, passed: 0 },
    });
  });

  it('lists failing anchors at their first failed stage with metadata', () => {
    expect(summary.failing).toEqual([
      { domain: 'gone.example', country: null, region: null, stage: 'toml' },
      { domain: 'nokey.example', country: null, region: null, stage: 'endpoints' },
      { domain: 'clpx.finance', country: 'CL', region: 'latam', stage: 'sep10', scfRound: 44 },
    ]);
  });
});

describe('stage helpers', () => {
  it('keeps the latest row per domain and stage', () => {
    const rerun = rowsFor('gone.example', { toml: true });
    const stages = latestStages([...unreachable, ...rerun]).get('gone.example');
    expect(stages && firstFailedStage(stages)).toBeNull();
  });
});
