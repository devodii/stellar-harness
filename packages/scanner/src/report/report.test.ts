import { emptySummary } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { formatPercent, renderReport, table } from './index';

const summary = emptySummary({
  snapshotLedger: 64722632,
  snapshotTime: '2026-10-02T00:00:00.000Z',
  ledgerCloseSeconds: 5.812,
  gitSha: 'abc123',
  network: 'mainnet',
});

describe('table', () => {
  it('escapes pipes and aligns numbers', () => {
    const out = table(
      [{ a: 'x|y', b: 3 }],
      [
        { header: 'A', value: (row) => row.a },
        { header: 'B', value: (row) => row.b, align: 'right' },
      ],
    );
    expect(out).toBe('| A | B |\n| --- | ---: |\n| x\\|y | 3 |');
  });

  it('marks empty tables', () => {
    expect(table([], [])).toBe('_no rows_');
  });
});

describe('renderReport', () => {
  it('renders every section from a summary', () => {
    const report = renderReport({
      summary: {
        ...summary,
        failures: {
          ...summary.failures,
          txScanned: 1000,
          txFailed: 120,
          byCode: { tx_bad_seq: 80 },
        },
      },
      exports: [
        {
          name: 'failure_clusters',
          path: 'data/exports/failure_clusters.csv',
          columns: ['account', 'count'],
          rowCount: 1,
          rows: [{ account: 'GABC', count: 42 }],
        },
      ],
      methodology: [
        {
          census: 'failures',
          endpoints: ['getTransactions'],
          parameters: { window: '7d' },
          notes: ['n'],
        },
      ],
      runs: [
        {
          census: 'failures',
          wallMs: 1500,
          requests: 10,
          networkCalls: 0,
          cachedHits: 10,
          gaps: 0,
        },
      ],
    });
    for (const title of [
      'Snapshot',
      'Headline',
      'Census 1',
      'Census 2',
      'Census 3',
      'Census 4',
      'Census 5',
      'Methodology',
      'Appendix',
    ]) {
      expect(report).toContain(title);
    }
    expect(report).toContain('| tx_bad_seq | 80 |');
    expect(report).toContain('| GABC | 42 |');
    expect(report).toContain('64,722,632');
  });

  it('formats percentages safely', () => {
    expect(formatPercent(1, 0)).toBe('0%');
    expect(formatPercent(1, 8)).toBe('12.5%');
  });
});
