import { describe, expect, it } from 'vitest';
import {
  FAILED_TX_BY_CODE_COLUMNS,
  FAILURE_CLUSTERS_COLUMNS,
  failedTxByCodeRows,
  failureClusterRows,
} from './export';

describe('failedTxByCodeRows', () => {
  it('sorts codes by count and marks preventable codes', () => {
    const rows = failedTxByCodeRows(
      { tx_failed: 8, op_underfunded: 3, op_over_source_max: 3, tx_bad_seq: 2 },
      10,
    );
    expect(rows).toEqual([
      { code: 'tx_failed', count: 8, preventable: 'no', share_of_failed: 0.8 },
      { code: 'op_over_source_max', count: 3, preventable: 'no', share_of_failed: 0.3 },
      { code: 'op_underfunded', count: 3, preventable: 'yes', share_of_failed: 0.3 },
      { code: 'tx_bad_seq', count: 2, preventable: 'yes', share_of_failed: 0.2 },
    ]);
    expect(Object.keys(rows[0] ?? {})).toEqual([...FAILED_TX_BY_CODE_COLUMNS]);
  });

  it('avoids dividing by zero', () => {
    expect(failedTxByCodeRows({ tx_failed: 1 }, 0)[0]?.share_of_failed).toBe(0);
  });
});

describe('failureClusterRows', () => {
  it('flattens cluster findings into csv rows in column order', () => {
    const rows = failureClusterRows([
      {
        type: 'OP_NO_TRUST_CLUSTER',
        subject: 'GSMALL',
        severity: 'high',
        evidence: { count: 11 },
        tags: ['failures'],
      },
      {
        type: 'TX_BAD_SEQ_CLUSTER',
        subject: 'GBIG',
        severity: 'high',
        evidence: {
          count: 40,
          firstLedger: 10,
          lastLedger: 99,
          sameLedgerCollisions: 12,
          multisig: true,
          homeDomain: 'anchor.example',
          funder: 'GFUNDER',
          topDestination: 'GDEST',
          asset: 'XLM',
          sampleHashes: ['abc', 'def'],
        },
        tags: ['failures', 'multisig', 'channel_pattern'],
      },
    ]);
    expect(rows[0]).toEqual({
      account: 'GBIG',
      type: 'TX_BAD_SEQ_CLUSTER',
      severity: 'high',
      count: 40,
      first_ledger: 10,
      last_ledger: 99,
      same_ledger_collisions: 12,
      multisig: 'true',
      home_domain: 'anchor.example',
      funder: 'GFUNDER',
      top_destination: 'GDEST',
      asset: 'XLM',
      sample_hash: 'abc',
      tags: 'failures;multisig;channel_pattern',
    });
    expect(Object.keys(rows[1] ?? {})).toEqual([...FAILURE_CLUSTERS_COLUMNS]);
    expect(rows[1]).toMatchObject({ account: 'GSMALL', home_domain: '', sample_hash: '' });
  });
});
