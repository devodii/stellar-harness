import { describe, expect, it } from 'vitest';
import type { HorizonAccount } from '../ports';
import { invokeTool } from '../tool';
import holderFixture from './__fixtures__/horizon-account-usdc-holder.json';
import issuerFixture from './__fixtures__/horizon-account-usdc-issuer.json';
import { fakeHorizon } from './__tests__/fakes';
import { getAccount } from './get-account';

const issuer: HorizonAccount = issuerFixture;
const holder: HorizonAccount = holderFixture;
const MISSING = 'GADQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOZPI';

describe('getAccount', () => {
  const { port } = fakeHorizon(
    { [issuer.id]: issuer, [holder.id]: holder },
    new Set(['GBROKEN'.padEnd(56, 'A')]),
  );
  const ctx = { horizon: port };

  it('maps a recorded multisig issuer account', async () => {
    const result = await invokeTool(getAccount, { address: issuer.id }, ctx);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data).toMatchObject({
      address: issuer.id,
      exists: true,
      sequence: '144373126631784461',
      thresholds: { low: 2, med: 2, high: 2 },
      flags: { authRequired: false, authRevocable: true, authClawbackEnabled: false },
      homeDomain: 'circle.com',
      subentryCount: 6,
      numSponsoring: 0,
      numSponsored: 0,
    });
    expect(result.data.signers).toHaveLength(5);
    expect(result.data.balances.at(-1)).toEqual({ asset: 'XLM', balance: '26180.7687456' });
  });

  it('includes trustline limits on credit balances', async () => {
    const result = await invokeTool(getAccount, { address: holder.id }, ctx);
    expect(result.ok && result.data.balances[0]).toEqual({
      asset: 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      balance: '5.8223544',
      limit: '922337203685.4775807',
    });
    expect(result.ok && result.data.homeDomain).toBeNull();
  });

  it('returns exists false for an account that is not on the ledger', async () => {
    const result = await invokeTool(getAccount, { address: MISSING }, ctx);
    expect(result).toMatchObject({
      ok: true,
      data: { address: MISSING, exists: false, sequence: null, balances: [] },
    });
  });

  it('rejects malformed addresses', async () => {
    const result = await invokeTool(getAccount, { address: 'GABC' }, ctx);
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });

  it('surfaces Horizon errors', async () => {
    const result = await invokeTool(getAccount, { address: 'GBROKEN'.padEnd(56, 'A') }, ctx);
    expect(result).toMatchObject({ ok: false, error: { code: 'UPSTREAM_TIMEOUT' } });
  });
});
