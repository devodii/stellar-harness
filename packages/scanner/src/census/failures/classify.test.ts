import { describe, expect, it } from 'vitest';
import singleSig from './__fixtures__/horizon-account-single-sig.json';
import usdcHolder from './__fixtures__/horizon-account-usdc-holder.json';
import usdcIssuer from './__fixtures__/horizon-account-usdc-issuer.json';
import createAccountPage from './__fixtures__/horizon-first-op-create-account.json';
import paymentPage from './__fixtures__/horizon-first-op-payment.json';
import { fakeHorizon, firstOperationOf, sequentialRunner } from './__tests__/fakes';
import {
  channelFunders,
  classifyAccounts,
  contractCallerShare,
  isAnchorDistribution,
  isMultisig,
} from './classify';
import type { HorizonAccount } from './ports';

const issuer: HorizonAccount = usdcIssuer;
const single: HorizonAccount = singleSig;
const holder: HorizonAccount = usdcHolder;

describe('classification rules', () => {
  it('detects multisig from the medium threshold or several weighted signers', () => {
    expect(isMultisig(issuer)).toBe(true);
    expect(isMultisig(single)).toBe(false);
    expect(isMultisig({ ...single, thresholds: { ...single.thresholds, med_threshold: 1 } })).toBe(
      false,
    );
    expect(
      isMultisig({
        ...single,
        signers: [...single.signers, { key: 'GOTHER', weight: 1, type: 'ed25519_public_key' }],
      }),
    ).toBe(true);
    expect(
      isMultisig({
        ...single,
        signers: [...single.signers, { key: 'GOTHER', weight: 0, type: 'ed25519_public_key' }],
      }),
    ).toBe(false);
  });

  it('matches anchor distribution by home domain, case-insensitively', () => {
    const anchors = new Set(['circle.com']);
    expect(isAnchorDistribution('Circle.com', anchors)).toBe(true);
    expect(isAnchorDistribution('atmbankdrops.org', anchors)).toBe(false);
    expect(isAnchorDistribution(undefined, anchors)).toBe(false);
    expect(isAnchorDistribution('circle.com', undefined)).toBe(false);
  });

  it('flags contract callers only above half of failed ops', () => {
    expect(contractCallerShare({ failures: 2, opCount: 4, invokeOps: 2 })).toBe(0.5);
    expect(contractCallerShare({ failures: 2, opCount: 3, invokeOps: 2 })).toBeCloseTo(0.667, 3);
    expect(contractCallerShare(undefined)).toBe(0);
  });

  it('finds funders shared by at least the minimum number of accounts', () => {
    const funders = new Map([
      ['G1', 'FA'],
      ['G2', 'FA'],
      ['G3', 'FA'],
      ['G4', 'FB'],
    ]);
    expect(channelFunders(funders, 3)).toEqual(new Set(['FA']));
    expect(channelFunders(funders, 4)).toEqual(new Set());
  });
});

describe('classifyAccounts', () => {
  const funded = firstOperationOf(createAccountPage);
  const payment = firstOperationOf(paymentPage);

  it('tags multisig, anchor distribution and contract callers from recorded accounts', async () => {
    const { port } = fakeHorizon({
      accounts: { [issuer.id]: issuer, [single.id]: single, [holder.id]: holder },
      firstOperations: { [issuer.id]: payment, [single.id]: funded, [holder.id]: payment },
    });
    const { byAccount, gaps, calls } = await classifyAccounts({
      accounts: [issuer.id, single.id, holder.id],
      horizon: port,
      run: sequentialRunner,
      concurrency: 2,
      anchorDomains: new Set(['CIRCLE.com']),
      activity: (account) =>
        account === holder.id ? { failures: 3, opCount: 3, invokeOps: 2 } : undefined,
    });
    expect(gaps).toEqual([]);
    expect(calls).toBe(6);
    expect(byAccount.get(issuer.id)).toMatchObject({
      exists: true,
      multisig: true,
      medThreshold: 2,
      signerCount: 4,
      homeDomain: 'circle.com',
      tags: ['multisig', 'anchor_distribution'],
      firstOperationType: 'payment',
    });
    expect(byAccount.get(single.id)).toMatchObject({
      tags: [],
      funder: 'GC2XJKN5VZEMM35F5LRSUP5CWVDZJVM37YKR7UYYXGN3TGKZXMP5FZIB',
    });
    expect(byAccount.get(holder.id)?.tags).toEqual(['contract_caller']);
    expect(byAccount.get(holder.id)?.reserveShortfallXlm).toBe(0.0475819);
    expect(byAccount.get(single.id)?.reserveShortfallXlm).toBeUndefined();
  });

  it('tags channel_pattern when at least five clustered accounts share a funder', async () => {
    const accounts = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];
    const firstOperations = Object.fromEntries(
      accounts.map((id, i) => [
        id,
        { type: 'create_account', funder: i < 5 ? 'GFUNDER' : 'GSOLO' },
      ]),
    );
    const { port } = fakeHorizon({ firstOperations });
    const { byAccount } = await classifyAccounts({
      accounts,
      horizon: port,
      run: sequentialRunner,
      concurrency: 2,
      activity: () => undefined,
    });
    expect(accounts.map((id) => byAccount.get(id)?.tags)).toEqual([
      ['channel_pattern'],
      ['channel_pattern'],
      ['channel_pattern'],
      ['channel_pattern'],
      ['channel_pattern'],
      [],
    ]);
  });

  it('ignores first operations that are not create_account', async () => {
    const accounts = ['G1', 'G2', 'G3', 'G4', 'G5'];
    const { port } = fakeHorizon({
      firstOperations: Object.fromEntries(accounts.map((id) => [id, payment])),
    });
    const { byAccount } = await classifyAccounts({
      accounts,
      horizon: port,
      run: sequentialRunner,
      concurrency: 1,
      activity: () => undefined,
    });
    expect([...byAccount.values()].every((c) => c.funder === undefined)).toBe(true);
  });

  it('records gaps for Horizon errors and marks missing accounts', async () => {
    const { port } = fakeHorizon({ failing: new Set(['GDOWN']) });
    const { byAccount, gaps } = await classifyAccounts({
      accounts: ['GDOWN', 'GMERGED'],
      horizon: port,
      run: sequentialRunner,
      concurrency: 1,
      activity: () => undefined,
    });
    expect(gaps.map((g) => [g.account, g.stage])).toEqual([
      ['GDOWN', 'account'],
      ['GDOWN', 'first_operation'],
    ]);
    expect(byAccount.get('GMERGED')).toMatchObject({ exists: false, tags: [] });
  });
});
