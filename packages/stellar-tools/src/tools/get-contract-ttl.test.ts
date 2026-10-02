import { describe, expect, it } from 'vitest';
import unverified from '../contracts/__fixtures__/expert-contract-unverified.json';
import archived from '../contracts/__fixtures__/rpc-ledger-entries-archived.json';
import router from '../contracts/__fixtures__/rpc-ledger-entries-router.json';
import type { ContractToolContext } from '../contracts/context';
import { fakeFetcher, fakeHorizon, fakeRpc } from '../contracts/fakes';
import type { LedgerEntryResult } from '../contracts/ports';
import { invokeTool } from '../tool';
import { getContractTtl } from './get-contract-ttl';

const BASE = 'https://api.stellar.expert/explorer/public';

const context = (
  entries: LedgerEntryResult[],
  latestLedger: number,
  details: Record<string, unknown> = {},
): ContractToolContext => ({
  rpc: fakeRpc({ entries, latestLedger }),
  horizon: fakeHorizon(),
  fetch: fakeFetcher(
    Object.fromEntries(
      Object.entries(details).map(([id, body]) => [`${BASE}/contract/${id}`, { body }]),
    ),
  ),
  stellarExpertUrl: BASE,
  ledgerCloseSeconds: 5,
});

describe('getContractTtl', () => {
  it('reports a live contract with instance, code and stellar.expert data', async () => {
    const ctx = context(router.result.entries, router.result.latestLedger, {
      [unverified.contract]: unverified,
    });
    const result = await invokeTool(getContractTtl, { contractId: unverified.contract }, ctx);
    expect(result).toMatchObject({
      ok: true,
      data: {
        executable: 'wasm',
        wasmHash: unverified.wasm,
        instance: {
          present: true,
          archived: false,
          liveUntilLedgerSeq: 67234828,
          daysLeft: 145.37,
        },
        code: { present: true, archived: false, liveUntilLedgerSeq: 67235018 },
        invocations: 235213,
        subinvocations: 217568,
        sourceValidation: 'unverified',
      },
    });
  });

  it('reports an archived instance', async () => {
    const ctx = context(archived.result.entries, archived.result.latestLedger);
    const result = await invokeTool(getContractTtl, { contractId: archived.contractId }, ctx);
    expect(result).toMatchObject({
      ok: true,
      data: {
        instance: { present: true, archived: true, daysLeft: 0 },
        code: { present: false, archived: true },
        invocations: null,
      },
    });
  });

  it('rejects a non contract address', async () => {
    const ctx = context([], 1);
    const result = await invokeTool(getContractTtl, { contractId: 'GABC' }, ctx);
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });

  it('returns NOT_FOUND for an unknown contract', async () => {
    const ctx = context([], 1);
    const result = await invokeTool(getContractTtl, { contractId: unverified.contract }, ctx);
    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});
