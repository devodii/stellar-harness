import { describe, expect, it } from 'vitest';
import { formatStroops, toStroops } from './amount';

describe('toStroops', () => {
  it('parses whole and fractional amounts', () => {
    expect(toStroops('25')).toBe(250_000_000n);
    expect(toStroops('0.0000001')).toBe(1n);
    expect(toStroops('17.74163')).toBe(177_416_300n);
    expect(toStroops('922337203685.4775807')).toBe(9_223_372_036_854_775_807n);
  });

  it('parses negative amounts', () => {
    expect(toStroops('-1.5')).toBe(-15_000_000n);
  });

  it('rejects malformed amounts', () => {
    expect(() => toStroops('1.00000001')).toThrow();
    expect(() => toStroops('abc')).toThrow();
  });
});

describe('formatStroops', () => {
  it('formats with seven decimals', () => {
    expect(formatStroops(250_000_000n)).toBe('25.0000000');
    expect(formatStroops(1n)).toBe('0.0000001');
    expect(formatStroops(-15_000_000n)).toBe('-1.5000000');
  });
});
