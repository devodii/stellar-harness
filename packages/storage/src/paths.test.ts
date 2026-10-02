import { describe, expect, it } from 'vitest';
import { dataDirFor } from './paths';

describe('dataDirFor', () => {
  it('keeps mainnet in the base dir and gives testnet a sibling', () => {
    expect(dataDirFor('./data')).toBe('./data');
    expect(dataDirFor('/repo/data/', 'testnet')).toBe('/repo/data-testnet');
  });
});
