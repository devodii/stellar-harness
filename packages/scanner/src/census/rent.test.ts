import { ok } from '@harness/schema';
import { DEFAULT_SIMULATION_SOURCE, type HorizonAccount } from '@harness/stellar-tools/contracts';
import { fakeFetcher, fakeHorizon, fakeRpc } from '@harness/stellar-tools/contracts/testing';
import { describe, expect, it } from 'vitest';
import coingecko from './__fixtures__/coingecko-xlm-usd.json';
import simulation from './__fixtures__/rpc-simulate-extend-365d.json';
import { contractRow, memorySinks, sequentialRun, ttl } from './contracts/testing';
import { COINGECKO_XLM_USD_URL } from './price';
import { median, RENT_DERIVED, rentSummary, rentTopRows, runRentCensus } from './rent';

const snapshot = {
  snapshotLedger: 64_722_837,
  snapshotTime: '2026-10-02T00:11:00.000Z',
  ledgerCloseSeconds: 5,
  gitSha: 'test',
  network: 'mainnet' as const,
};

const source = {
  id: DEFAULT_SIMULATION_SOURCE,
  sequence: '144373126631784461',
} as HorizonAccount;

const scf = { slug: 'soroswap', name: 'Soroswap', round: 21 };
const contracts = [
  contractRow(1, { scf }),
  contractRow(2, { wasm: null, code: null }),
  contractRow(3, { instance: ttl.archived() }),
  contractRow(4, { instance: null }),
];

const fees = [491_604_076, 10_000_000];

const deps = (overrides: Partial<Parameters<typeof runRentCensus>[0]> = {}) => {
  let call = 0;
  const rpc = fakeRpc({
    simulate: () =>
      ok({ ...simulation.result, minResourceFee: String(fees[call++ % fees.length]) }),
  });
  const sinks = memorySinks();
  return {
    sinks,
    rpc,
    deps: {
      rpc,
      horizon: fakeHorizon([source]),
      fetch: fakeFetcher({ [COINGECKO_XLM_USD_URL]: { body: coingecko } }),
      run: sequentialRun,
      snapshot,
      ...sinks,
      ...overrides,
    },
  };
};

describe('median', () => {
  it('handles odd, even and empty inputs', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe('runRentCensus', () => {
  it('simulates every live instance for 365 days and summarises the cost', async () => {
    const { deps: d, sinks, rpc } = deps();
    const result = await runRentCensus(d, contracts);
    expect(result.method).toEqual({ kind: 'all', population: 2 });
    expect(result.stats).toEqual({ liveInstances: 2, sampled: 2, simulated: 2, failed: 0 });
    expect(rpc.calls.simulate).toHaveLength(2);
    expect(sinks.derived[RENT_DERIVED]).toEqual([
      {
        contract: contracts[0]?.contract,
        extendToLedgers: 6_307_200,
        minResourceFeeStroops: fees[0],
      },
      {
        contract: contracts[1]?.contract,
        extendToLedgers: 6_307_200,
        minResourceFeeStroops: fees[1],
      },
    ]);
    expect(result.summary).toEqual({
      contractsEstimated: 2,
      totalXlm12m: 50.1604076,
      medianXlm12m: 25.0802038,
      scfFundedXlm12m: 49.1604076,
      xlmUsd: {
        price: 0.219068,
        source: 'coingecko:simple/price',
        at: new Date(coingecko.stellar.last_updated_at * 1000).toISOString(),
      },
    });
    expect(sinks.findings).toHaveLength(2);
    expect(sinks.findings[0]).toMatchObject({
      type: 'CONTRACT_RENT_12M',
      severity: 'info',
      evidence: { xlm12m: 49.1604076, usd12m: 10.77, days: 365 },
      tags: ['contract', 'rent', 'scf_funded', 'scf:soroswap', 'scf_round_21'],
    });
    expect(result.top[0]).toMatchObject({ contract: contracts[0]?.contract, scf_slug: 'soroswap' });
  });

  it('records a gap and keeps going when the price api fails', async () => {
    const { deps: d } = deps({ fetch: fakeFetcher({}) });
    const result = await runRentCensus(d, contracts);
    expect(result.summary.xlmUsd).toMatchObject({ price: 0, source: 'unavailable' });
    expect(result.gaps.map((gap) => gap.source)).toEqual(['price:xlm_usd']);
    expect(result.top[0]?.usd12m).toBeNull();
  });

  it('records a gap when the simulation source account is missing', async () => {
    const { deps: d } = deps({ horizon: fakeHorizon() });
    const result = await runRentCensus(d, contracts);
    expect(result.rows).toEqual([]);
    expect(result.gaps.map((gap) => gap.source)).toEqual(['horizon:simulation_source']);
  });

  it('counts failed simulations as a gap', async () => {
    const { deps: d } = deps({
      rpc: fakeRpc({ simulate: () => ok({ error: 'HostError', latestLedger: 1 }) }),
    });
    const result = await runRentCensus(d, contracts);
    expect(result.stats.failed).toBe(2);
    expect(result.gaps[0]).toMatchObject({
      source: 'rpc:simulateTransaction',
      error: { code: 'UPSTREAM_FAILED', meta: { failed: 2 } },
    });
  });
});

describe('rentSummary and rentTopRows', () => {
  it('limits the top list and orders by cost', () => {
    const rows = [
      { contract: 'CB', extendToLedgers: 1, minResourceFeeStroops: 5 },
      { contract: 'CA', extendToLedgers: 1, minResourceFeeStroops: 9 },
      { contract: 'CC', extendToLedgers: 1, minResourceFeeStroops: 5 },
    ];
    const price = { price: 0, source: 'unavailable', at: new Date(0).toISOString() };
    expect(rentTopRows(rows, new Map(), price, 2).map((row) => row.contract)).toEqual(['CA', 'CB']);
    expect(rentSummary([], new Map(), price)).toMatchObject({
      contractsEstimated: 0,
      totalXlm12m: 0,
      medianXlm12m: 0,
    });
  });
});
