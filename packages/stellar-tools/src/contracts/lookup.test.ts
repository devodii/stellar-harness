import { describe, expect, it } from 'vitest';
import unverified from './__fixtures__/expert-contract-unverified.json';
import router from './__fixtures__/rpc-ledger-entries-router.json';
import { fakeFetcher, fakeRpc } from './fakes';
import { codeKeyXdr } from './keys';
import { footprintKeys, lookupContract } from './lookup';

const BASE = 'https://api.stellar.expert/explorer/public';
const ROUTER = unverified.contract;
const ROUTER_WASM = unverified.wasm;
const detailUrl = `${BASE}/contract/${ROUTER}`;

const deps = (entries = router.result.entries, withDetail = true) => ({
  rpc: fakeRpc({ entries, latestLedger: router.result.latestLedger }),
  fetch: fakeFetcher(withDetail ? { [detailUrl]: { body: unverified } } : {}),
  stellarExpertUrl: BASE,
});

describe('lookupContract', () => {
  it('reads the instance, its wasm and the code entry', async () => {
    const d = deps();
    const result = await lookupContract(d, ROUTER, { withExpert: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      executable: 'wasm',
      wasmHash: ROUTER_WASM,
      latestLedger: router.result.latestLedger,
      instanceEntry: { liveUntilLedgerSeq: 67234828 },
      codeEntry: { liveUntilLedgerSeq: 67235018 },
      expert: { invocations: 235213 },
    });
    expect(footprintKeys(result.value)).toHaveLength(2);
    expect(d.rpc.calls.getLedgerEntries).toEqual([
      [router.request.keys[0]],
      [codeKeyXdr(ROUTER_WASM)],
    ]);
  });

  it('skips stellar.expert when not asked and the instance is readable', async () => {
    const result = await lookupContract(deps(), ROUTER, { withExpert: false });
    expect(result.ok && result.value.expert).toBeNull();
  });

  it('falls back to the stellar.expert wasm when the instance entry is missing', async () => {
    const code = router.result.entries.slice(1);
    const result = await lookupContract(deps(code), ROUTER, { withExpert: false });
    expect(result.ok && result.value).toMatchObject({
      executable: 'wasm',
      wasmHash: ROUTER_WASM,
      instanceEntry: undefined,
      codeEntry: { liveUntilLedgerSeq: 67235018 },
    });
  });

  it('fails with NOT_FOUND when neither the ledger nor stellar.expert know the contract', async () => {
    const result = await lookupContract(deps([], false), ROUTER, { withExpert: true });
    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});
