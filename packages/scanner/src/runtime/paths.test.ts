import { describe, expect, it } from 'vitest';
import { dataDirFor, reportFileFor } from './paths';

describe('scan paths', () => {
  it('keeps mainnet output where it was', () => {
    expect(reportFileFor('mainnet')).toBe('REPORT.md');
    expect(dataDirFor('/repo/data', 'mainnet')).toBe('/repo/data');
  });

  it('puts testnet output next to it', () => {
    expect(reportFileFor('testnet')).toBe('REPORT.testnet.md');
    expect(dataDirFor('/repo/data', 'testnet')).toBe('/repo/data-testnet');
  });
});
