import type { Report } from '@/lib/report-model';
import { fakeAccount, fakeContract, fakeHash } from '../story-ids';

export const REPORT_FIXTURE: Report = {
  summary: {
    snapshot: {
      snapshotLedger: 64_723_488,
      snapshotTime: '2026-10-02T01:07:02.000Z',
      ledgerCloseSeconds: 5,
    },
    contracts: {
      total: 154_434,
      archivedInstances: 65_140,
      expiring30d: 45_050,
      archivedMeaningful: 240,
      expiring30dMeaningful: 123,
    },
    failures: {
      windowStart: '2026-10-01T01:07:07.000Z',
      windowEnd: '2026-10-02T01:07:02.000Z',
      txScanned: 4_729_762,
      txFailed: 988_544,
      preventable: { total: 101_363 },
    },
    anchors: {
      domainsTested: 202,
      failing: new Array(202).fill(null),
      perSep: { sep1: { tested: 202, passed: 68 }, sep10: { tested: 21, passed: 10 } },
    },
    rent: {
      contractsEstimated: 2000,
      totalXlm12m: 56_979.16,
      medianXlm12m: 21.54,
      xlmUsd: { price: 0.218705, source: 'coingecko:simple/price', at: '2026-10-02T00:48:10.000Z' },
    },
  },
  files: [
    {
      name: 'failed_tx_by_code.csv',
      sha256: fakeHash(1),
      rowCount: 35,
      publishedAt: '2026-10-03T23:00:00.000Z',
    },
    {
      name: 'summary.json',
      sha256: fakeHash(2),
      rowCount: 1,
      publishedAt: '2026-10-03T23:00:00.000Z',
    },
  ],
  csv: {
    'failed_tx_by_code.csv': [
      { code: 'op_underfunded', count: '67202', preventable: 'yes', share_of_failed: '0.068' },
      { code: 'op_over_source_max', count: '438253', preventable: 'no', share_of_failed: '0.443' },
    ],
    'failure_clusters.csv': [
      {
        account: fakeAccount('lobstr'),
        type: 'OP_NO_TRUST_CLUSTER',
        count: '12017',
        home_domain: 'lobstr.co',
        tags: 'failures;domain:lobstr.co',
      },
      {
        account: fakeAccount('channel'),
        type: 'OP_UNDERFUNDED_CLUSTER',
        count: '900',
        home_domain: '',
        tags: 'failures;channel_pattern',
      },
      {
        account: fakeAccount('anchor'),
        type: 'OP_UNDERFUNDED_CLUSTER',
        count: '300',
        home_domain: 'stellarterm.com',
        tags: 'failures;anchor_distribution',
      },
    ],
    'contracts_archived_meaningful.csv': [
      {
        contract: fakeContract('a'),
        wasm: fakeHash(3),
        family_size: '1',
        invocations: '1218693',
        live_until_ledger: '0',
        days_left: '0',
        scf_slug: '',
        scf_round: '',
      },
      {
        contract: fakeContract('b'),
        wasm: fakeHash(3),
        family_size: '2',
        invocations: '16062',
        live_until_ledger: '0',
        days_left: '0',
        scf_slug: 'allbridge',
        scf_round: '23',
      },
    ],
    'contracts_expiring_30d.csv': [
      {
        contract: fakeContract('c'),
        wasm: fakeHash(4),
        family_size: '1',
        invocations: '512',
        live_until_ledger: '64800000',
        days_left: '4.4',
        scf_slug: '',
        scf_round: '',
      },
      {
        contract: fakeContract('d'),
        wasm: fakeHash(5),
        family_size: '124585',
        invocations: '0',
        live_until_ledger: '64723714',
        days_left: '0.01',
        scf_slug: '',
        scf_round: '',
      },
    ],
    'anchors_funnel.csv': [
      { step: 'domainsTested', domains: '202' },
      { step: 'tomlReachable', domains: '68' },
      { step: 'sep10', domains: '10' },
    ],
    'anchors_failing.csv': [
      {
        domain: 'clpx.finance',
        country: 'BR',
        region: 'LATAM',
        stage_failed: 'sep10',
        scf_round: '',
        toml_url: 'https://clpx.finance/.well-known/stellar.toml',
      },
    ],
    'rent_top100.csv': [{ contract: fakeContract('e'), xlm12m: '335.6894492', usd12m: '73.42' }],
  },
};
