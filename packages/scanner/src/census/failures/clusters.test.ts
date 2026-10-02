import { describe, expect, it } from 'vitest';
import { failedRow } from './__tests__/rows';
import { CLUSTER_RULES, ClusterAccumulator, type ClusterType } from './clusters';
import type { FailedTx } from './rows';

const ACCOUNT = 'GACCOUNT';

const repeat = (count: number, build: (i: number) => FailedTx): FailedTx[] =>
  Array.from({ length: count }, (_, i) => build(i));

const clusterTypes = (rows: FailedTx[]) => {
  const acc = new ClusterAccumulator();
  acc.add(rows);
  return acc.clusters().map((c) => c.type);
};

describe('cluster thresholds', () => {
  const cases: [ClusterType, string[], number][] = [
    ['TX_BAD_SEQ_CLUSTER', ['tx_bad_seq'], 20],
    ['TX_INSUFFICIENT_FEE_CLUSTER', ['tx_insufficient_fee'], 20],
    ['TX_TOO_LATE_CLUSTER', ['tx_too_late'], 10],
    ['TX_BAD_AUTH_CLUSTER', ['tx_bad_auth'], 10],
    ['OP_NO_TRUST_CLUSTER', ['tx_failed', 'op_no_trust'], 10],
    ['OP_UNDERFUNDED_CLUSTER', ['tx_failed', 'op_underfunded'], 10],
    ['OP_NO_DESTINATION_CLUSTER', ['tx_failed', 'op_no_destination'], 10],
    ['OP_LOW_RESERVE_CLUSTER', ['tx_failed', 'op_low_reserve'], 10],
    ['OP_LOW_RESERVE_CLUSTER', ['tx_insufficient_balance'], 10],
    ['OP_LINE_FULL_CLUSTER', ['tx_failed', 'op_line_full'], 10],
  ];

  it.each(cases)('%s fires at %s x %i and not one below', (type, codes, threshold) => {
    const build = (i: number) => failedRow({ sourceAccount: ACCOUNT, ledger: 100 + i, codes });
    expect(clusterTypes(repeat(threshold - 1, build))).not.toContain(type);
    expect(clusterTypes(repeat(threshold, build))).toContain(type);
  });

  it('uses the brief severities', () => {
    const severity = Object.fromEntries(CLUSTER_RULES.map((r) => [r.type, r.severity]));
    expect(severity).toEqual({
      TX_BAD_SEQ_CLUSTER: 'high',
      TX_INSUFFICIENT_FEE_CLUSTER: 'medium',
      TX_TOO_LATE_CLUSTER: 'medium',
      TX_BAD_AUTH_CLUSTER: 'medium',
      OP_NO_TRUST_CLUSTER: 'high',
      OP_UNDERFUNDED_CLUSTER: 'high',
      OP_NO_DESTINATION_CLUSTER: 'medium',
      OP_LOW_RESERVE_CLUSTER: 'medium',
      OP_LINE_FULL_CLUSTER: 'low',
    });
  });

  it('accepts threshold overrides', () => {
    const acc = new ClusterAccumulator();
    acc.add(
      repeat(3, (i) => failedRow({ sourceAccount: ACCOUNT, ledger: i + 1, codes: ['tx_bad_seq'] })),
    );
    expect(acc.clusters()).toEqual([]);
    expect(acc.clusters({ TX_BAD_SEQ_CLUSTER: 3 }).map((c) => c.type)).toEqual([
      'TX_BAD_SEQ_CLUSTER',
    ]);
  });

  it('keeps accounts separate', () => {
    const rows = repeat(20, (i) =>
      failedRow({ sourceAccount: i % 2 === 0 ? 'GA' : 'GB', ledger: i + 1, codes: ['tx_bad_seq'] }),
    );
    expect(clusterTypes(rows)).toEqual([]);
  });

  it('counts a tx once even when several ops share the code', () => {
    const rows = repeat(9, (i) =>
      failedRow({
        sourceAccount: ACCOUNT,
        ledger: i + 1,
        codes: ['tx_failed', 'op_no_trust', 'op_no_trust', 'op_no_trust'],
      }),
    );
    expect(clusterTypes(rows)).toEqual([]);
  });

  it('does not count op codes when the tx code is not tx_failed', () => {
    const rows = repeat(10, (i) =>
      failedRow({ sourceAccount: ACCOUNT, ledger: i + 1, codes: ['tx_too_late', 'op_no_trust'] }),
    );
    expect(clusterTypes(rows)).toEqual(['TX_TOO_LATE_CLUSTER']);
  });
});

describe('cluster evidence', () => {
  it('reports count, ledger span and same-ledger collisions for bad sequence storms', () => {
    const rows = [
      ...repeat(16, (i) =>
        failedRow({ sourceAccount: ACCOUNT, ledger: 200 + i, codes: ['tx_bad_seq'] }),
      ),
      failedRow({ sourceAccount: ACCOUNT, ledger: 300, codes: ['tx_bad_seq'] }),
      failedRow({ sourceAccount: ACCOUNT, ledger: 300, codes: ['tx_bad_seq'] }),
      failedRow({ sourceAccount: ACCOUNT, ledger: 300, codes: ['tx_bad_seq'] }),
      failedRow({ sourceAccount: ACCOUNT, ledger: 310, codes: ['tx_bad_seq'] }),
      failedRow({ sourceAccount: ACCOUNT, ledger: 310, codes: ['tx_failed', 'op_underfunded'] }),
      failedRow({ sourceAccount: 'GOTHER', ledger: 205, codes: ['tx_bad_seq'] }),
    ];
    const acc = new ClusterAccumulator();
    acc.add(rows);
    const [cluster] = acc.clusters();
    expect(cluster).toMatchObject({
      type: 'TX_BAD_SEQ_CLUSTER',
      account: ACCOUNT,
      severity: 'high',
      evidence: {
        count: 20,
        firstLedger: 200,
        lastLedger: 310,
        sameLedgerCollisions: 4,
        codes: { tx_bad_seq: 20 },
        accountFailures: 21,
      },
    });
    expect(cluster?.evidence.sampleHashes).toHaveLength(3);
  });

  it('records which codes fed a combined low reserve cluster', () => {
    const rows = [
      ...repeat(6, (i) =>
        failedRow({
          sourceAccount: ACCOUNT,
          ledger: i + 1,
          codes: ['tx_failed', 'op_low_reserve'],
        }),
      ),
      ...repeat(4, (i) =>
        failedRow({ sourceAccount: ACCOUNT, ledger: i + 50, codes: ['tx_insufficient_balance'] }),
      ),
    ];
    const acc = new ClusterAccumulator();
    acc.add(rows);
    expect(acc.clusters()[0]?.evidence.codes).toEqual({
      op_low_reserve: 6,
      tx_insufficient_balance: 4,
    });
  });

  it('reports the most frequent failing payment target for plan recipes', () => {
    const usdc = 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
    const rows = [
      ...repeat(7, (i) =>
        failedRow({
          sourceAccount: ACCOUNT,
          ledger: i + 1,
          codes: ['tx_failed', 'op_no_trust'],
          payment: { destination: 'GDEST1', asset: usdc, amount: '25.0000000' },
        }),
      ),
      ...repeat(3, (i) =>
        failedRow({
          sourceAccount: ACCOUNT,
          ledger: i + 20,
          codes: ['tx_failed', 'op_no_trust'],
          payment: { destination: 'GDEST2', asset: usdc, amount: '1.0000000' },
        }),
      ),
    ];
    const acc = new ClusterAccumulator();
    acc.add(rows);
    expect(acc.clusters()[0]?.evidence).toMatchObject({
      topDestination: 'GDEST1',
      topDestinationCount: 7,
      asset: usdc,
      sampleAmount: '25.0000000',
    });
  });

  it('omits payment target evidence when rows carry no payment', () => {
    const acc = new ClusterAccumulator();
    acc.add(repeat(10, (i) => failedRow({ sourceAccount: ACCOUNT, ledger: i + 1 })));
    expect(acc.clusters()[0]?.evidence).not.toHaveProperty('topDestination');
  });

  it('tracks per-account operation mix for classification', () => {
    const acc = new ClusterAccumulator();
    acc.add([
      failedRow({ sourceAccount: ACCOUNT, opTypes: ['invoke_host_function'] }),
      failedRow({ sourceAccount: ACCOUNT, opTypes: ['payment', 'invoke_host_function'] }),
    ]);
    expect(acc.activity(ACCOUNT)).toEqual({ failures: 2, opCount: 3, invokeOps: 2 });
    expect(acc.activity('GNONE')).toBeUndefined();
  });
});
