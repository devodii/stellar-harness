import { appError, err, ok } from '@harness/schema';
import { Networks, type Transaction, TransactionBuilder } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import account from '../contracts/__fixtures__/horizon-account-circle.json';
import archived from '../contracts/__fixtures__/rpc-ledger-entries-archived.json';
import router from '../contracts/__fixtures__/rpc-ledger-entries-router.json';
import extend365 from '../contracts/__fixtures__/rpc-simulate-extend-365d.json';
import extendArchived from '../contracts/__fixtures__/rpc-simulate-extend-archived.json';
import restore from '../contracts/__fixtures__/rpc-simulate-restore.json';
import type { ContractToolContext } from '../contracts/context';
import { DEFAULT_SIMULATION_SOURCE, SIMULATION_SOURCES } from '../contracts/defaults';
import { type FakeRpc, fakeFetcher, fakeHorizon, fakeRpc } from '../contracts/fakes';
import { codeKeyXdr, instanceKeyXdr } from '../contracts/keys';
import type { HorizonAccount, LedgerEntryResult } from '../contracts/ports';
import circle from '../core/__fixtures__/rpc-account-circle-testnet.json';
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

const simulatedTx = (ctx: { rpc: FakeRpc }) =>
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
        contractId: ROUTER,
        minResourceFeeStroops: 491_604_076,
        estimatedXlm: 49.1604176,
      },
    });
    expect(result.ok && Object.keys(result.data).sort()).toEqual([
      'contractId',
      'days',
      'estimatedXlm',
      'extendToLedgers',
      'footprint',
      'minResourceFeeStroops',
      'operation',
    ]);
    expect(result.ok && result.data.operation).toBe(
      'Extend the TTL of the contract instance and its wasm code to 365 days (ExtendFootprintTTL)',
    );
    const tx = simulatedTx(ctx);
    expect(tx.source).toBe(DEFAULT_SIMULATION_SOURCE);
    expect(tx.operations[0]).toMatchObject({ type: 'extendFootprintTtl', extendTo: 6_307_200 });
    expect(tx.signatures).toHaveLength(0);
  });

  it('honours a custom number of days', async () => {
    const ctx = context(router.result.entries, extend365);
    const result = await invokeTool(simulateExtendTtl, { contractId: ROUTER, days: 30 }, ctx);
    expect(result.ok && result.data.extendToLedgers).toBe(518_400);
  });

  it('rejects more than 730 days', async () => {
    const ctx = context(router.result.entries, extend365);
    const result = await invokeTool(simulateExtendTtl, { contractId: ROUTER, days: 731 }, ctx);
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });

  it('simulates from the context source account when one is configured', async () => {
    const ctx = {
      ...context(archived.result.entries, extendArchived),
      simulationSource: account.id,
    };
    const result = await invokeTool(simulateExtendTtl, { contractId: archived.contractId }, ctx);
    expect(result.ok && result.data.minResourceFeeStroops).toBe(179_194_774);
    expect(simulatedTx(ctx).source).toBe(account.id);
  });

  it('fails when the source account does not exist', async () => {
    const ctx = { ...context(router.result.entries, extend365), horizon: fakeHorizon() };
    const result = await invokeTool(simulateExtendTtl, { contractId: ROUTER }, ctx);
    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  it('simulates from the testnet source read over RPC when testnet Horizon is down', async () => {
    const base = context(
      [...router.result.entries, { key: circle.key, xdr: circle.xdr }],
      extend365,
    );
    const ctx = {
      ...base,
      network: 'testnet' as const,
      horizon: { ...fakeHorizon(), account: async () => err(appError('UPSTREAM_FAILED', 'down')) },
    };
    const result = await invokeTool(simulateExtendTtl, { contractId: ROUTER }, ctx);
    expect(result.ok).toBe(true);
    expect(simulatedTx(ctx).source).toBe(SIMULATION_SOURCES.testnet);
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
        entries: 'both',
        operation:
          'Restore the contract instance and its wasm code from the archive (RestoreFootprint)',
        footprint: { readOnly: [] },
      },
    });
    expect(result.ok && result.data.footprint.readWrite).toHaveLength(2);
    expect(simulatedTx(ctx).operations[0]).toMatchObject({ type: 'restoreFootprint' });
  });

  it('restores only the instance when asked', async () => {
    const ctx = context(archived.result.entries, restore);
    const result = await invokeTool(
      simulateRestore,
      { contractId: archived.contractId, entries: 'instance' },
      ctx,
    );
    expect(result.ok && result.data.footprint.readWrite).toEqual([
      instanceKeyXdr(archived.contractId),
    ]);
  });

  it('restores only the code when asked', async () => {
    const ctx = context(archived.result.entries, restore);
    const result = await invokeTool(
      simulateRestore,
      { contractId: archived.contractId, entries: 'code' },
      ctx,
    );
    expect(result.ok && result.data).toMatchObject({
      entries: 'code',
      footprint: {
        readWrite: [codeKeyXdr('07097f83dae3b746db7dba3263d9cc334efb88a9a7d5450fb96ca19f33d284b0')],
      },
    });
  });
});
