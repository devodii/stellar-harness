import { describe, expect, it } from 'vitest';
import { formatDecimal, summarizeArgs, truncateMiddle } from './format';

describe('format', () => {
  it('truncates long identifiers in the middle', () => {
    expect(truncateMiddle('GAPV2C4BTHXPL2IVYDXJ5PUU7Q3LAXU7OAQDP7KVYHLCNM2JTAJNOQQI')).toBe(
      'GAPV…OQQI',
    );
  });

  it('leaves short values intact', () => {
    expect(truncateMiddle('mykobo.co')).toBe('mykobo.co');
  });

  it('formats decimals with grouping and a digit cap', () => {
    expect(formatDecimal(9893.9109013)).toBe('9,893.91');
    expect(formatDecimal(27.3142165, 1)).toBe('27.3');
  });

  it('summarizes tool arguments compactly', () => {
    expect(
      summarizeArgs({
        contractId: 'CDZYZVZNURK4DCD3ZJMBKLDYCB7FIYL3FRVSLRLGL2BEOIN53UP4YNQC',
        days: 365,
        skip: undefined,
      }),
    ).toBe('contractId=CDZY…YNQC, days=365');
    expect(summarizeArgs({ operations: ['extend_ttl', 'restore'] })).toBe(
      'operations=[extend_ttl,restore]',
    );
    expect(summarizeArgs(null)).toBe('');
  });
});
