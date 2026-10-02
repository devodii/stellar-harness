import { ACTION_BY_CODE } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { invokeTool } from '../tool';
import { fakeHorizon } from './__tests__/fakes';
import { buildPaymentPreflight } from './build-payment-preflight';
import {
  fundedHolder,
  holder,
  MISSING,
  noTrustline,
  USDC,
  withUsdcLine,
} from './preflight/__tests__/accounts';

const accounts = { [fundedHolder.id]: fundedHolder, [noTrustline.id]: noTrustline };

describe('buildPaymentPreflight', () => {
  it('blocks 25 USDC to an account with no USDC trustline and proposes a sponsored trustline', async () => {
    const { port, calls } = fakeHorizon(accounts);
    const result = await invokeTool(
      buildPaymentPreflight,
      { from: fundedHolder.id, to: noTrustline.id, asset: USDC, amount: '25' },
      { horizon: port },
    );
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data.ok).toBe(false);
    expect(result.data.blockers).toEqual([
      { code: 'op_no_trust', fix: ACTION_BY_CODE.op_no_trust },
    ]);
    expect(result.data.checks).toHaveLength(8);
    expect(result.data.alternative).toMatchObject({
      title: `Sponsor a USDC trustline for ${noTrustline.id}, then pay`,
      handoff: { requiredAuthority: 'account_signer' },
    });
    expect(calls.sort()).toEqual([fundedHolder.id, noTrustline.id].sort());
  });

  it('returns ok with no alternative when nothing blocks', async () => {
    const destination = withUsdcLine(noTrustline);
    const { port } = fakeHorizon({ ...accounts, [destination.id]: destination });
    const result = await invokeTool(
      buildPaymentPreflight,
      { from: fundedHolder.id, to: destination.id, asset: USDC, amount: '25' },
      { horizon: port },
    );
    expect(result).toMatchObject({ ok: true, data: { ok: true, blockers: [] } });
    expect(result.ok && result.data.alternative).toBeUndefined();
  });

  it('proposes a claimable balance for a missing destination', async () => {
    const { port } = fakeHorizon(accounts);
    const result = await invokeTool(
      buildPaymentPreflight,
      { from: fundedHolder.id, to: MISSING, asset: USDC, amount: '25' },
      { horizon: port },
    );
    expect(result.ok && result.data.blockers.map((b) => b.code)).toEqual(['op_no_destination']);
    expect(result.ok && result.data.alternative?.planId).toMatch(/^preflight-claimable_balance-/);
  });

  it('reports the live low reserve source without an alternative', async () => {
    const { port } = fakeHorizon({ [holder.id]: holder, [noTrustline.id]: noTrustline });
    const result = await invokeTool(
      buildPaymentPreflight,
      { from: holder.id, to: noTrustline.id, asset: 'XLM', amount: '1' },
      { horizon: port },
    );
    expect(result.ok && result.data.blockers.map((b) => b.code)).toEqual(['op_low_reserve']);
    expect(result.ok && result.data.alternative).toBeUndefined();
  });

  it('rejects invalid input and surfaces Horizon errors', async () => {
    const { port } = fakeHorizon(accounts, new Set([noTrustline.id]));
    const invalid = await invokeTool(
      buildPaymentPreflight,
      { from: fundedHolder.id, to: noTrustline.id, asset: 'USDC', amount: '25' },
      { horizon: port },
    );
    expect(invalid).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    const upstream = await invokeTool(
      buildPaymentPreflight,
      { from: fundedHolder.id, to: noTrustline.id, asset: USDC, amount: '25' },
      { horizon: port },
    );
    expect(upstream).toMatchObject({ ok: false, error: { code: 'UPSTREAM_TIMEOUT' } });
  });
});
