import { appError, err, ok } from '@harness/schema';
import {
  Networks,
  SorobanDataBuilder,
  type Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import circle from '../core/__fixtures__/rpc-account-circle-testnet.json';
import account from './__fixtures__/horizon-account-circle.json';
import extend365 from './__fixtures__/rpc-simulate-extend-365d.json';
import extendArchived from './__fixtures__/rpc-simulate-extend-archived.json';
import restore from './__fixtures__/rpc-simulate-restore.json';
import { fakeHorizon, fakeRpc } from './fakes';
import { codeKeyXdr, contractCodeKey, contractInstanceKey, instanceKeyXdr } from './keys';
import type { HorizonAccount } from './ports';
import { buildFootprintTransaction, fetchSimulationSource, simulateFootprint } from './rent';

const ROUTER = 'CAG5LRYQ5JVEUI5TEID72EYOVX44TTUJT5BQR2J6J77FH65PCCFAJDDH';
const ROUTER_WASM = '4c3db3ebd2d6a2ab23de1f622eaabb39501539b4611b68622ec4e47f76c4ba07';
const IDLE = 'CDZZZADKQPBUEBSTLON3M666R2Z73EMERP5KUBY6YETA76XZKSLSFDD4';
const IDLE_WASM = '07097f83dae3b746db7dba3263d9cc334efb88a9a7d5450fb96ca19f33d284b0';
const RECORDED_EXTEND_TO = 5_437_241;
const source = {
  accountId: account.id,
  sequence: '144373126631784461',
  networkPassphrase: Networks.PUBLIC,
};

const decode = (txXdr: string) => TransactionBuilder.fromXdr(txXdr, Networks.PUBLIC) as Transaction;

const replay =
  (fixture: { request: { transaction: string }; result: unknown }) => (txXdr: string) => {
    expect(txXdr).toBe(fixture.request.transaction);
    return ok(fixture.result as { latestLedger: number });
  };

describe('buildFootprintTransaction', () => {
  it('reproduces the recorded extend transaction byte for byte', () => {
    const tx = buildFootprintTransaction(
      source,
      [contractInstanceKey(ROUTER), contractCodeKey(ROUTER_WASM)],
      { kind: 'extend', extendToLedgers: RECORDED_EXTEND_TO },
    );
    expect(tx.toXdr()).toBe(extend365.request.transaction);
    expect(tx.signatures).toHaveLength(0);
  });

  it('signs nothing but hashes against the source network passphrase', () => {
    const keys = [contractInstanceKey(ROUTER)];
    const action = { kind: 'extend', extendToLedgers: RECORDED_EXTEND_TO } as const;
    const mainnet = buildFootprintTransaction(source, keys, action);
    const testnet = buildFootprintTransaction(
      { ...source, networkPassphrase: Networks.TESTNET },
      keys,
      action,
    );
    expect(testnet.networkPassphrase).toBe(Networks.TESTNET);
    expect(testnet.toXdr()).toBe(mainnet.toXdr());
    expect(Buffer.from(testnet.hash()).toString('hex')).not.toBe(
      Buffer.from(mainnet.hash()).toString('hex'),
    );
  });
});

describe('simulateFootprint', () => {
  it('returns the fee, xlm estimate and read only footprint for an extension', async () => {
    const rpc = fakeRpc({ simulate: replay(extend365) });
    const result = await simulateFootprint(
      rpc,
      source,
      [contractInstanceKey(ROUTER), contractCodeKey(ROUTER_WASM)],
      { kind: 'extend', extendToLedgers: RECORDED_EXTEND_TO },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      minResourceFeeStroops: 491_604_076,
      estimatedXlm: 49.1604176,
      footprint: { readOnly: [instanceKeyXdr(ROUTER), codeKeyXdr(ROUTER_WASM)], readWrite: [] },
      restorePreamble: null,
      latestLedger: 64_722_853,
    });
    const unsigned = decode(result.value.unsignedXdr);
    expect(unsigned.fee).toBe(String(491_604_076 + 100));
    expect(unsigned.signatures).toHaveLength(0);
    expect(rpc.calls.simulate).toHaveLength(1);
  });

  it('keeps the estimate when the resource fee overflows the transaction fee field', async () => {
    const overflow = 9_690_000_000;
    const rpc = fakeRpc({
      simulate: () =>
        ok({
          ...extend365.result,
          minResourceFee: String(overflow),
          transactionData: new SorobanDataBuilder(extend365.result.transactionData)
            .setResourceFee(overflow)
            .build()
            .toXDR('base64'),
        }),
    });
    const result = await simulateFootprint(
      rpc,
      source,
      [contractInstanceKey(ROUTER), contractCodeKey(ROUTER_WASM)],
      { kind: 'extend', extendToLedgers: RECORDED_EXTEND_TO },
    );
    expect(result.ok && result.value.minResourceFeeStroops).toBe(overflow);
    expect(result.ok && decode(result.value.unsignedXdr).fee).toBe('100');
  });

  it('builds a read write footprint for a restore', async () => {
    const rpc = fakeRpc({ simulate: replay(restore) });
    const result = await simulateFootprint(
      rpc,
      source,
      [contractInstanceKey(IDLE), contractCodeKey(IDLE_WASM)],
      { kind: 'restore' },
    );
    expect(result.ok && result.value).toMatchObject({
      minResourceFeeStroops: 784_506,
      footprint: { readOnly: [], readWrite: [instanceKeyXdr(IDLE), codeKeyXdr(IDLE_WASM)] },
    });
  });

  it('surfaces the restore preamble when extending an archived instance', async () => {
    const rpc = fakeRpc({ simulate: replay(extendArchived) });
    const result = await simulateFootprint(
      rpc,
      source,
      [contractInstanceKey(IDLE), contractCodeKey(IDLE_WASM)],
      { kind: 'extend', extendToLedgers: RECORDED_EXTEND_TO },
    );
    expect(result.ok && result.value.restorePreamble).toEqual({ minResourceFeeStroops: 784_506 });
  });

  it('fails when the simulation reports an error', async () => {
    const rpc = fakeRpc({
      simulate: () => ok({ error: 'HostError: storage', latestLedger: 1 }),
    });
    const result = await simulateFootprint(rpc, source, [contractInstanceKey(ROUTER)], {
      kind: 'restore',
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'UPSTREAM_FAILED', message: 'HostError: storage' },
    });
  });
});

describe('fetchSimulationSource', () => {
  it('reads the sequence of an existing account', async () => {
    const horizon = fakeHorizon([account as HorizonAccount]);
    expect(
      await fetchSimulationSource({ horizon, rpc: fakeRpc() }, account.id, Networks.PUBLIC),
    ).toEqual({
      ok: true,
      value: {
        accountId: account.id,
        sequence: account.sequence,
        networkPassphrase: Networks.PUBLIC,
      },
    });
  });

  it('reads the sequence from RPC when Horizon is down', async () => {
    const horizon = {
      ...fakeHorizon(),
      account: async () => err(appError('UPSTREAM_FAILED', 'connect ECONNREFUSED')),
    };
    const rpc = fakeRpc({
      entries: [{ key: circle.key, xdr: circle.xdr }],
    });
    const result = await fetchSimulationSource(
      { horizon, rpc },
      circle.accountId,
      Networks.TESTNET,
    );
    expect(result).toEqual({
      ok: true,
      value: {
        accountId: circle.accountId,
        sequence: '2920577761306',
        networkPassphrase: Networks.TESTNET,
      },
    });
  });

  it('fails with NOT_FOUND for a missing account', async () => {
    const result = await fetchSimulationSource(
      { horizon: fakeHorizon(), rpc: fakeRpc() },
      account.id,
      Networks.PUBLIC,
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});
