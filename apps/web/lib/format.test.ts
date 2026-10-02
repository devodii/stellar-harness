import { describe, expect, it } from 'vitest';
import {
  formatAgo,
  formatPercent,
  formatXlm,
  ratio,
  stroopsToXlm,
  summarizeArgs,
  truncateMiddle,
} from './format';

describe('format', () => {
  it('truncates long identifiers in the middle', () => {
    expect(truncateMiddle('GAPV2C4BTHXPL2IVYDXJ5PUU7Q3LAXU7OAQDP7KVYHLCNM2JTAJNOQQI')).toBe(
      'GAPV…OQQI',
    );
  });

  it('leaves short values intact', () => {
    expect(truncateMiddle('mykobo.co')).toBe('mykobo.co');
  });

  it('converts stroops to xlm', () => {
    expect(stroopsToXlm('12345678')).toBeCloseTo(1.2345678);
    expect(formatXlm(1.5)).toBe('1.5 XLM');
  });

  it('formats ratios and guards empty denominators', () => {
    expect(formatPercent(0.4567)).toBe('45.7%');
    expect(ratio(1, 0)).toBeNull();
  });

  it('summarizes tool arguments compactly', () => {
    expect(
      summarizeArgs({
        contractId: 'CDZYZVZNURK4DCD3ZJMBKLDYCB7FIYL3FRVSLRLGL2BEOIN53UP4YNQC',
        days: 365,
        skip: undefined,
      }),
    ).toBe('contractId=CDZY…YNQC, days=365');
    expect(summarizeArgs({ severity: ['high', 'critical'] })).toBe('severity=[high,critical]');
    expect(summarizeArgs(null)).toBe('');
  });

  it('formats relative time', () => {
    const now = Date.parse('2026-10-02T00:10:00Z');
    expect(formatAgo('2026-10-02T00:09:42Z', now)).toBe('18s ago');
    expect(formatAgo('2026-10-01T22:10:00Z', now)).toBe('2h ago');
  });
});
