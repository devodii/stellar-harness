import { describe, expect, it } from 'vitest';
import { camelToSnake } from './case';

describe('camelToSnake', () => {
  it('splits camel case words', () => {
    expect(camelToSnake('pathPaymentStrictReceive')).toBe('path_payment_strict_receive');
    expect(camelToSnake('extendFootprintTtl')).toBe('extend_footprint_ttl');
    expect(camelToSnake('NoTrust')).toBe('no_trust');
    expect(camelToSnake('underfunded')).toBe('underfunded');
  });

  it('keeps acronym runs together', () => {
    expect(camelToSnake('parseXDRValue')).toBe('parse_xdr_value');
  });
});
