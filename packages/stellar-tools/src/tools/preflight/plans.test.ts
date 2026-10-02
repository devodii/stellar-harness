import { Plan } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { parseAsset } from '../assets';
import { MISSING, USDC } from './__tests__/accounts';
import type { PreflightCode } from './checks';
import { alternativePlan, chooseAlternative, submitBoundary } from './plans';

const FROM = 'GDFUPCI2KNGHHVM5OL4G5LM7WDJJYIJZTAPQWAQ66DX4KJZZQLE2ET5M';
const TO = 'GASWSYFT5UDG7JTJQI2CGO6HF5KQIQAP5L6JCNM3ETMUFIARTQ73ATMB';

const input = (blockers: PreflightCode[], asset = USDC, amount = '25', to = TO) => ({
  from: FROM,
  to,
  asset: parseAsset(asset),
  amount,
  blockers,
});

describe('chooseAlternative', () => {
  it.each([
    [['op_no_trust'], USDC, '25', 'sponsored_trustline'],
    [['op_not_authorized'], USDC, '25', 'claimable_balance'],
    [['op_line_full'], USDC, '25', 'claimable_balance'],
    [['op_no_destination'], USDC, '25', 'claimable_balance'],
    [['op_no_destination'], 'XLM', '1', 'create_account'],
    [['op_no_destination'], 'XLM', '0.9999999', null],
    [['op_no_trust', 'op_underfunded'], USDC, '25', null],
    [['op_no_destination', 'tx_no_source_account'], 'XLM', '5', null],
    [['op_low_reserve'], 'XLM', '5', null],
    [[], USDC, '25', null],
  ] as [PreflightCode[], string, string, string | null][])(
    '%j for %s %s -> %s',
    (blockers, asset, amount, expected) => {
      expect(chooseAlternative(input(blockers, asset, amount))).toBe(expected);
    },
  );
});

describe('alternativePlan', () => {
  it('builds a CAP-33 sponsored trustline plan that passes the Plan schema', () => {
    const plan = alternativePlan(input(['op_no_trust']));
    if (!plan) throw new Error('expected a plan');
    expect(Plan.parse(plan)).toEqual(plan);
    expect(plan.subject).toBe(TO);
    expect(plan.estimatedCostXlm).toBe(0.5);
    expect(plan.steps.map((s) => [s.id, s.kind, s.tool])).toEqual([
      ['s1', 'read', 'getAccount'],
      ['s2', 'build', 'buildTransaction'],
      ['s3', 'submit', 'submitTransaction'],
      ['s4', 'read', 'buildPaymentPreflight'],
      ['s5', 'build', 'buildTransaction'],
      ['s6', 'submit', 'submitTransaction'],
    ]);
    expect(plan.steps[1]?.args.operations).toEqual([
      { type: 'begin_sponsoring_future_reserves', source: FROM, sponsoredId: TO },
      { type: 'change_trust', source: TO, asset: USDC },
      { type: 'end_sponsoring_future_reserves', source: TO },
    ]);
    expect(plan.steps[2]?.args).toEqual({
      fromStep: 's2',
      network: 'mainnet',
      signers: [FROM, TO],
    });
    expect(plan.steps[5]?.args).toMatchObject({ fromStep: 's5' });
    expect(plan.steps.every((s) => s.status === 'pending')).toBe(true);
    expect(plan.requiresApproval).toBe(true);
    expect(plan.boundary).toEqual({
      rule: 'submit_requires_approval',
      reason: 'The plan submits a transaction; every submission needs explicit approval.',
      threshold: '0 submissions without approval',
      requested: '2 submissions',
    });
  });

  it('builds a claimable balance plan with the destination as claimant', () => {
    const plan = alternativePlan(input(['op_no_destination'], USDC, '25', MISSING));
    expect(plan?.steps[1]?.args.operations).toEqual([
      {
        type: 'create_claimable_balance',
        asset: USDC,
        amount: '25',
        claimants: [{ destination: MISSING, predicate: 'unconditional' }],
      },
    ]);
    expect(plan?.boundary?.requested).toBe('1 submission');
    expect(plan?.planId).toMatch(/^preflight-claimable_balance-[0-9a-f]{8}$/);
  });

  it('builds a create_account plan for XLM to a missing destination', () => {
    const plan = alternativePlan(input(['op_no_destination'], 'XLM', '5', MISSING));
    expect(plan?.title).toBe(`Create and fund ${MISSING} with 5 XLM`);
    expect(plan?.steps[1]?.args.operations).toEqual([
      { type: 'create_account', destination: MISSING, startingBalance: '5' },
    ]);
    expect(plan?.requiresApproval).toBe(true);
  });

  it('returns no plan when the sender must act first', () => {
    expect(alternativePlan(input(['op_underfunded']))).toBeUndefined();
  });

  it('gives stable plan ids for the same request', () => {
    expect(alternativePlan(input(['op_no_trust']))?.planId).toBe(
      alternativePlan(input(['op_no_trust']))?.planId,
    );
    expect(alternativePlan(input(['op_no_trust']))?.planId).not.toBe(
      alternativePlan(input(['op_no_trust'], USDC, '26'))?.planId,
    );
  });
});

describe('submitBoundary', () => {
  it('requires no approval without submit steps', () => {
    expect(submitBoundary([{ kind: 'read' }, { kind: 'build' }])).toEqual({
      requiresApproval: false,
    });
  });
});
