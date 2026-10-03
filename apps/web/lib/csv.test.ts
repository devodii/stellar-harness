import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv';

describe('parseCsv', () => {
  it('maps rows to the header columns', () => {
    expect(parseCsv('code,count\nop_no_trust,28866\nop_underfunded,67202\n')).toEqual([
      { code: 'op_no_trust', count: '28866' },
      { code: 'op_underfunded', count: '67202' },
    ]);
  });

  it('keeps commas and escaped quotes inside quoted cells', () => {
    expect(parseCsv('domain,evidence\nclpx.finance,"a, b ""c"""')).toEqual([
      { domain: 'clpx.finance', evidence: 'a, b "c"' },
    ]);
  });

  it('keeps line breaks inside quoted cells', () => {
    expect(
      parseCsv('domain,evidence\r\na.example,"line one\nline two)"\r\nb.example,ok\r\n'),
    ).toEqual([
      { domain: 'a.example', evidence: 'line one\nline two)' },
      { domain: 'b.example', evidence: 'ok' },
    ]);
  });

  it('fills missing cells and ignores blank lines', () => {
    expect(parseCsv('a,b\n1\n\n')).toEqual([{ a: '1', b: '' }]);
    expect(parseCsv('')).toEqual([]);
  });
});
