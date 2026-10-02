import { ok } from '@harness/schema';
import { Networks, type Transaction, TransactionBuilder } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import account from '../contracts/__fixtures__/horizon-account-circle.json';
import archived from '../contracts/__fixtures__/rpc-ledger-entries-archived.json';
import router from '../contracts/__fixtures__/rpc-ledger-entries-router.json';
import extend365 from '../contracts/__fixtures__/rpc-simulate-extend-365d.json';
import extendArchived from '../contracts/__fixtures__/rpc-simulate-extend-archived.json';
import restore from '../contracts/__fixtures__/rpc-simulate-restore.json';
import type { ContractToolContext } from '../contracts/context';
import { DEFAULT_SIMULATION_SOURCE } from '../contracts/defaults';
import { type FakeRpc, fakeFetcher, fakeHorizon, fakeRpc } from '../contracts/fakes';
import type { HorizonAccount, LedgerEntryResult } from '../contracts/ports';
import { invokeTool } from '../tool';
import { simulateExtendTtl } from './simulate-extend-ttl';
import { simulateRestore } from './simulate-restore';

const ROUTER = 'CAG5LRYQ5JVEUI5TEID72EYOVX44TTUJT5BQR2J6J77FH65PCCFAJDDH';

const context = (
  entries: LedgerEntryResult[],
  simulation: { result: unknown },
): ContractToolContext & { rpc: FakeRpc } => ({
  rpc: fakeRpc({
    entries,
    latestLedger: 64_722_853,
    simulate: () => ok(simulation.result as { latestLedger: number }),
  }),
  horizon: fakeHorizon([account as HorizonAccount]),
  fetch: fakeFetcher({}),
  stellarExpertUrl: 'https://api.stellar.expert/explorer/public',
  ledgerCloseSeconds: 5,
});

const submitted = (ctx: { rpc: FakeRpc }) =>
  TransactionBuilder.fromXdr(ctx.rpc.calls.simulate[0] ?? '', Networks.PUBLIC) as Transaction;

describe('simulateExtendTtl', () => {
  it('extends instance and code for 365 days from the default source', async () => {
    const ctx = context(router.result.entries, extend365);
    const result = await invokeTool(simulateExtendTtl, { contractId: ROUTER }, ctx);
    expect(result).toMatchObject({
      ok: true,
      data: {
        days: 365,
        extendToLedgers: 6_307_200,
        sourceAccount: DEFAULT_SIMULATION_SOURCE,
        minResourceFeeStroops: 491_604_076,
        estimatedXlm: 49.1604176,
        restorePreamble: null,
        wasmHash: '4c3db3ebd2d6a2ab23de1f622eaabb39501539b4611b68622ec4e47f76c4ba07',
      },
    });
    const tx = submitted(ctx);
    expect(tx.source).toBe(DEFAULT_SIMULATION_SOURCE);
    expect(tx.operations[0]).toMatchObject({ type: 'extendFootprintTtl', extendTo: 6_307_200 });
    expect(tx.signatures).toHaveLength(0);
  });

  it('honours a custom number of days', async () => {
    const ctx = context(router.result.entries, extend365);
    const result = await invokeTool(simulateExtendTtl, { contractId: ROUTER, days: 30 }, ctx);
    expect(result.ok && result.data.extendToLedgers).toBe(518_400);
  });

  it('reports the restore preamble for an archived instance', async () => {
    const ctx = context(archived.result.entries, extendArchived);
    const result = await invokeTool(simulateExtendTtl, { contractId: archived.contractId }, ctx);
    expect(result.ok && result.data.restorePreamble).toEqual({ minResourceFeeStroops: 784_506 });
  });

  it('fails when the source account does not exist', async () => {
    const ctx = { ...context(router.result.entries, extend365), horizon: fakeHorizon() };
    const result = await invokeTool(simulateExtendTtl, { contractId: ROUTER }, ctx);
    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});

describe('simulateRestore', () => {
  it('restores the archived instance with a read write footprint', async () => {
    const ctx = context(archived.result.entries, restore);
    const result = await invokeTool(simulateRestore, { contractId: archived.contractId }, ctx);
    expect(result).toMatchObject({
      ok: true,
      data: {
        minResourceFeeStroops: 784_506,
        estimatedXlm: 0.0784606,
        wasmHash: '07097f83dae3b746db7dba3263d9cc334efb88a9a7d5450fb96ca19f33d284b0',
        footprint: { readOnly: [] },
      },
    });
    expect(result.ok && result.data.footprint.readWrite).toHaveLength(2);
    expect(submitted(ctx).operations[0]).toMatchObject({ type: 'restoreFootprint' });
  });

  it('accepts a caller supplied source account', async () => {
    const ctx = context(archived.result.entries, restore);
    const result = await invokeTool(
      simulateRestore,
      { contractId: archived.contractId, sourceAccount: account.id },
      ctx,
    );
    expect(result.ok && result.data.sourceAccount).toBe(account.id);
  });
});
