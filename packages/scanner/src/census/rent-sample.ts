export const RENT_FULL_POPULATION_LIMIT = 5_000;
export const RENT_SAMPLE_SIZE = 2_000;
export const RENT_SAMPLE_SEED = 20_261_002;
export const RENT_STRATA = 10;

export type Stratum = {
  decile: number;
  population: number;
  sampled: number;
  minInvocations: number | null;
  maxInvocations: number | null;
};

export type SampleMethod =
  | { kind: 'all'; population: number }
  | {
      kind: 'stratified_invocations_decile';
      population: number;
      sampleSize: number;
      seed: number;
      strata: Stratum[];
    };

type Sampleable = { contract: string; invocations: number };

export const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const shuffled = <T>(items: T[], random: () => number): T[] => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap] as T, copy[index] as T];
  }
  return copy;
};

export const allocate = (sizes: number[], total: number): number[] => {
  const population = sizes.reduce((sum, size) => sum + size, 0);
  if (population === 0) return sizes.map(() => 0);
  const exact = sizes.map((size) => (size * total) / population);
  const allocation = exact.map(Math.floor);
  let remaining = total - allocation.reduce((sum, value) => sum + value, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (remaining === 0) break;
    allocation[index] = (allocation[index] ?? 0) + 1;
    remaining -= 1;
  }
  return allocation;
};

export const selectRentSample = <T extends Sampleable>(
  items: T[],
  options: { limit?: number; sampleSize?: number; seed?: number } = {},
): { sample: T[]; method: SampleMethod } => {
  const limit = options.limit ?? RENT_FULL_POPULATION_LIMIT;
  if (items.length < limit)
    return { sample: items, method: { kind: 'all', population: items.length } };

  const sampleSize = options.sampleSize ?? RENT_SAMPLE_SIZE;
  const seed = options.seed ?? RENT_SAMPLE_SEED;
  const ordered = [...items].sort(
    (a, b) => a.invocations - b.invocations || a.contract.localeCompare(b.contract),
  );
  const deciles = Array.from({ length: RENT_STRATA }, (_, decile) =>
    ordered.slice(
      Math.floor((decile * ordered.length) / RENT_STRATA),
      Math.floor(((decile + 1) * ordered.length) / RENT_STRATA),
    ),
  );
  const allocation = allocate(
    deciles.map((decile) => decile.length),
    sampleSize,
  );
  const random = mulberry32(seed);
  const picked = deciles.map((decile, index) =>
    shuffled(decile, random).slice(0, allocation[index] ?? 0),
  );
  return {
    sample: picked.flat().sort((a, b) => a.contract.localeCompare(b.contract)),
    method: {
      kind: 'stratified_invocations_decile',
      population: items.length,
      sampleSize,
      seed,
      strata: deciles.map((decile, index) => ({
        decile: index + 1,
        population: decile.length,
        sampled: picked[index]?.length ?? 0,
        minInvocations: decile[0]?.invocations ?? null,
        maxInvocations: decile[decile.length - 1]?.invocations ?? null,
      })),
    },
  };
};
