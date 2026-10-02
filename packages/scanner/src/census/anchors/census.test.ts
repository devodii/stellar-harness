import type {
  AnchorTestsReport,
  FindingDraft,
  HorizonAccount,
} from '@harness/stellar-tools/anchors';
import {
  readFixture as toolsFixture,
  readJsonFixture as toolsJson,
} from '@harness/stellar-tools/anchors/testing';
import { describe, expect, it } from 'vitest';
import {
  ANCHOR_DOMAINS_FILE,
  type AnchorCensusDeps,
  domainTags,
  makeAnchorProbe,
  runAnchorCensus,
} from './census';
import { mergeCandidates } from './domains';
import { sequentialRun } from './ports';
import type { AnchorCensusState, AnchorDomain } from './schemas';
import { fakeFetcher, fakeHorizon, jsonRoute } from './testing';

const ACAO = { 'access-control-allow-origin': '*' };
const ISSUER = 'GDYSPBVZHPQTYMGSYNOHRZQNLB3ZWFVQ2F7EP7YBOLRGD42XIC3QUX5G';

const routes = {
  'https://clpx.finance/.well-known/stellar.toml': {
    body: toolsFixture('toml/clpx.finance.toml'),
    headers: ACAO,
  },
  'https://kbtrading.org/sep6/info': jsonRoute(toolsJson('info/kbtrading-sep6.json'), ACAO),
  'https://kbtrading.org/sep24/info': jsonRoute(toolsJson('info/anclap-sep24.json'), ACAO),
  'https://kbtrading.org/sep31/info': jsonRoute(toolsJson('info/kbtrading-sep31.json'), ACAO),
  'https://kbtrading.org/auth': jsonRoute(
    toolsJson<{ body: unknown }>('sep10/clpx.json').body,
    ACAO,
  ),
  'https://gone.example/.well-known/stellar.toml': { status: 404, body: 'Not Found' },
  'https://kbtrading.org/.well-known/stellar.toml': { status: 404, body: 'Not Found' },
};

const account = toolsJson<HorizonAccount>('horizon/account-anclap-ars.json');
const horizon = fakeHorizon({ [ISSUER]: { ...account, id: ISSUER, home_domain: 'clpx.finance' } });

const domains: AnchorDomain[] = mergeCandidates([
  {
    domain: 'clpx.finance',
    source: 'stellarlight_partner',
    name: 'CLPX',
    country: 'Chile',
    regions: ['latam'],
    scfRounds: [41],
  },
  { domain: 'gone.example', source: 'stellar_expert_asset' },
]);

const testsReport = (domain: string): AnchorTestsReport => ({
  domain,
  requestedSeps: [1],
  ranSeps: [1],
  perSep: { '1': { passed: 5, failed: 0, skipped: 0, names: [] } },
  excludedSeps: [],
  excludedTests: [],
  error: null,
});

const harness = () => {
  const derived: Record<string, unknown[]> = {};
  const json: Record<string, unknown> = {};
  const emitted: FindingDraft[] = [];
  const checkpoints: AnchorCensusState[] = [];
  const testRuns: string[] = [];
  const deps: AnchorCensusDeps = {
    probe: makeAnchorProbe(
      { fetch: fakeFetcher(routes), horizon },
      {
        runAnchorTests: async (domain) => {
          testRuns.push(domain);
          return testsReport(domain);
        },
      },
    ),
    run: sequentialRun,
    emit: (draft) => {
      emitted.push(draft);
    },
    writeDerived: async (name, rows) => {
      derived[name] = [...(derived[name] ?? []), ...rows];
    },
    writeJson: async (path, data) => {
      json[path] = data;
    },
    checkpoint: async (state) => {
      checkpoints.push(state);
    },
    now: () => 0,
  };
  return { deps, derived, json, emitted, checkpoints, testRuns };
};

describe('domainTags', () => {
  it('tags region, scf round and iso country', () => {
    expect(domainTags(domains[0] as AnchorDomain)).toEqual([
      'anchor',
      'region:latam',
      'scf_round_41',
      'country:CL',
    ]);
  });
});

describe('runAnchorCensus', () => {
  it('probes every domain plus transitive endpoint hosts and writes one row per stage', async () => {
    const h = harness();
    const result = await runAnchorCensus(domains, h.deps, { runAnchorTests: true });

    expect(result.domains.map((d) => [d.domain, d.sources])).toEqual([
      ['clpx.finance', ['stellarlight_partner']],
      ['gone.example', ['stellar_expert_asset']],
      ['kbtrading.org', ['transitive']],
    ]);
    const rows = h.derived.anchor_probe ?? [];
    expect(rows).toHaveLength(27);
    expect(rows[0]).toEqual({
      domain: 'clpx.finance',
      stage: 'toml',
      ok: true,
      status: 200,
      ms: 5,
      error: null,
    });
    expect(h.testRuns).toEqual(['clpx.finance']);
    expect(h.json['anchor_tests/clpx.finance.json']).toEqual(testsReport('clpx.finance'));
    expect(h.json[ANCHOR_DOMAINS_FILE]).toEqual(result.domains);
    expect(h.checkpoints.at(-1)).toEqual({
      lastDomain: 'kbtrading.org',
      completed: ['clpx.finance', 'gone.example', 'kbtrading.org'],
    });
  });

  it('emits findings tagged with the domain metadata', async () => {
    const h = harness();
    await runAnchorCensus(domains, h.deps, { runAnchorTests: false });
    const sep10 = h.emitted.find((f) => f.type === 'ANCHOR_SEP10_CHALLENGE_FAILS');
    expect(sep10?.tags).toEqual(['anchor', 'region:latam', 'scf_round_41', 'country:CL']);
    const unreachable = h.emitted.filter((f) => f.type === 'ANCHOR_TOML_UNREACHABLE');
    expect(unreachable.map((f) => [f.subject, f.severity, f.tags])).toEqual([
      ['gone.example', 'critical', ['anchor']],
      ['kbtrading.org', 'critical', ['anchor']],
    ]);
  });

  it('resumes after the checkpointed domains', async () => {
    const h = harness();
    const result = await runAnchorCensus(domains, h.deps, {
      transitive: false,
      resume: { lastDomain: 'clpx.finance', completed: ['clpx.finance'] },
    });
    expect(result.skipped).toBe(1);
    expect(result.results.map((r) => r.domain)).toEqual(['gone.example']);
  });

  it('records probe failures without stopping the run', async () => {
    const h = harness();
    h.deps.probe = async (domain) => {
      throw new Error(`exploded on ${domain}`);
    };
    const result = await runAnchorCensus(domains, h.deps, { transitive: false });
    expect(result.failures).toEqual([
      { domain: 'clpx.finance', error: 'exploded on clpx.finance' },
      { domain: 'gone.example', error: 'exploded on gone.example' },
    ]);
  });
});
