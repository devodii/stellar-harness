import { appError, err, ok } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { fakeHorizon, fakeRpc } from '../contracts/fakes';
import type { HorizonAccount } from '../ports';
import circle from './__fixtures__/rpc-account-circle-testnet.json';
import {
  accountLedgerKey,
  accountWithRpcFallback,
  decodeAccountEntry,
  readAccountFromRpc,
  withRpcAccountFallback,
} from './account-entry';

const CIRCLE_TESTNET = circle.accountId;
const CIRCLE_TESTNET_ENTRY = circle.xdr;

const entry = { key: accountLedgerKey(CIRCLE_TESTNET), xdr: CIRCLE_TESTNET_ENTRY };
const horizonAccount = (sequence: string): HorizonAccount => ({
  id: CIRCLE_TESTNET,
  sequence,
  subentry_count: 0,
  thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
  flags: {
    auth_required: false,
    auth_revocable: false,
    auth_immutable: false,
    auth_clawback_enabled: false,
  },
  signers: [],
  balances: [],
});
const horizonDown = err(appError('UPSTREAM_FAILED', 'connect ECONNREFUSED'));

describe('decodeAccountEntry', () => {
  it('maps a testnet account ledger entry to the Horizon account shape', () => {
    const account = decodeAccountEntry(CIRCLE_TESTNET, CIRCLE_TESTNET_ENTRY);
    expect(account).toMatchObject({
      id: CIRCLE_TESTNET,
      sequence: '2920577761306',
      home_domain: 'centre.io',
      subentry_count: 2,
      num_sponsored: 0,
      num_sponsoring: 0,
      thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
      flags: { auth_required: false, auth_revocable: true, auth_clawback_enabled: false },
      signers: [{ key: CIRCLE_TESTNET, weight: 1, type: 'ed25519_public_key' }],
    });
    expect(account?.balances).toEqual([
      {
        asset_type: 'native',
        balance: '69775.5723753',
        buying_liabilities: '0.0000000',
        selling_liabilities: '0.0000000',
      },
    ]);
  });
});

describe('readAccountFromRpc', () => {
  it('builds the recorded ledger key', () => {
    expect(accountLedgerKey(CIRCLE_TESTNET)).toBe(circle.key);
  });

  it('reads the account entry by its ledger key', async () => {
    const rpc = fakeRpc({ entries: [entry] });
    const result = await readAccountFromRpc(rpc, CIRCLE_TESTNET);
    expect(result.ok && result.value?.sequence).toBe('2920577761306');
    expect(rpc.calls.getLedgerEntries).toEqual([[entry.key]]);
  });

  it('returns null for an account with no entry', async () => {
    expect(await readAccountFromRpc(fakeRpc(), CIRCLE_TESTNET)).toEqual(ok(null));
  });

  it('rejects ids that are not account ids', async () => {
    const result = await readAccountFromRpc(fakeRpc(), 'not-an-account');
    expect(result.ok ? null : result.error.code).toBe('INVALID_INPUT');
  });
});

describe('accountWithRpcFallback', () => {
  it('keeps the Horizon answer when Horizon responds', async () => {
    const horizon = fakeHorizon([horizonAccount('7')]);
    const rpc = fakeRpc({ entries: [entry] });
    const result = await accountWithRpcFallback(horizon, rpc, CIRCLE_TESTNET);
    expect(result.ok && result.value?.sequence).toBe('7');
    expect(rpc.calls.getLedgerEntries).toEqual([]);
  });

  it('reads from RPC when Horizon fails', async () => {
    const horizon = { ...fakeHorizon(), account: async () => horizonDown };
    const port = withRpcAccountFallback(horizon, fakeRpc({ entries: [entry] }));
    const result = await port.account(CIRCLE_TESTNET);
    expect(result.ok && result.value?.home_domain).toBe('centre.io');
  });

  it('reports the Horizon error when RPC fails too', async () => {
    const horizon = { ...fakeHorizon(), account: async () => horizonDown };
    const rpc = {
      ...fakeRpc(),
      getLedgerEntries: async () => err(appError('UPSTREAM_FAILED', 'rpc down')),
    };
    expect(await accountWithRpcFallback(horizon, rpc, CIRCLE_TESTNET)).toEqual(horizonDown);
  });
});
