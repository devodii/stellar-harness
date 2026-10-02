import { describe, expect, it } from 'vitest';
import { allocate, mulberry32, selectRentSample } from './rent-sample';

const population = (size: number) =>
  Array.from({ length: size }, (_, index) => ({
    contract: `C${String(index).padStart(6, '0')}`,
    invocations: (index * 7919) % 1000,
  }));

describe('mulberry32', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('allocate', () => {
  it('splits a total proportionally with largest remainders', () => {
    expect(allocate([3, 3, 4], 5)).toEqual([2, 1, 2]);
    expect(allocate([0, 0], 5)).toEqual([0, 0]);
  });
});

describe('selectRentSample', () => {
  it('keeps every contract below the population limit', () => {
    const items = population(4_999);
    const { sample, method } = selectRentSample(items);
    expect(sample).toBe(items);
    expect(method).toEqual({ kind: 'all', population: 4_999 });
  });

  it('draws a stratified 2,000 sample by invocation decile at 5,000 or more', () => {
    const { sample, method } = selectRentSample(population(12_345));
    expect(sample).toHaveLength(2_000);
    expect(new Set(sample.map((item) => item.contract)).size).toBe(2_000);
    expect(method.kind).toBe('stratified_invocations_decile');
    if (method.kind !== 'stratified_invocations_decile') return;
    expect(method.strata).toHaveLength(10);
    expect(method.strata.reduce((sum, stratum) => sum + stratum.population, 0)).toBe(12_345);
    expect(method.strata.every((stratum) => stratum.sampled >= 199)).toBe(true);
    expect(method.strata[0]?.minInvocations).toBe(0);
    expect(method.strata[9]?.maxInvocations).toBe(999);
  });

  it('is reproducible for the same seed and differs for another', () => {
    const items = population(6_000);
    const first = selectRentSample(items).sample.map((item) => item.contract);
    const again = selectRentSample([...items].reverse()).sample.map((item) => item.contract);
    const other = selectRentSample(items, { seed: 7 }).sample.map((item) => item.contract);
    expect(again).toEqual(first);
    expect(other).not.toEqual(first);
  });
});
