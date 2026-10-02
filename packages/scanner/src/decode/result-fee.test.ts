import { describe, expect, it } from 'vitest';
import { readFeeCharged } from './result-fee';

describe('readFeeCharged', () => {
  it('reads feeCharged from a classic failed result', () => {
    expect(readFeeCharged('AAAAAAAAAGT/////AAAAAQAAAAAAAAAB/////gAAAAA=')).toBe('100');
  });

  it('reads the outer feeCharged from a fee bump result', () => {
    const feeBump =
      'AAAAAAAANiD////zHFVzGtza7bx5FFhCWhH4y95HAcit9PUQjzgbPC74iMsAAAAAAAAAAP////8AAAABAAAAAAAAABj////+AAAAAAAAAAA=';
    expect(readFeeCharged(feeBump)).toBe('13856');
  });

  it('rejects truncated input', () => {
    expect(() => readFeeCharged('AAAA')).toThrow();
  });
});
