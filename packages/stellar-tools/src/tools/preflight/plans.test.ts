import { Plan, ROADMAP_NOTE } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { parseAsset } from '../assets';
import { MISSING, USDC } from './__tests__/accounts';
import type { PreflightCode } from './checks';
import { alternativePlan, chooseAlternative } from './plans';

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
  it('builds a sponsored trustline plan that hands off to the account signers', () => {
    const plan = alternativePlan(input(['op_no_trust']));
    if (!plan) throw new Error('expected a plan');
    expect(Plan.parse(plan)).toEqual(plan);
    expect(plan.subject).toBe(TO);
    expect(plan.steps.map((s) => [s.id, s.kind, s.tool])).toEqual([
      ['s1', 'read', 'getAccount'],
      ['s2', 'read', 'getAccount'],
      ['s3', 'handoff', 'handoff'],
    ]);
    expect(plan.steps[0]?.args).toEqual({ address: FROM });
    expect(plan.steps[1]?.args).toEqual({ address: TO });
    expect(plan.steps.every((s) => s.status === 'pending')).toBe(true);
    expect(plan.handoff).toEqual({
      summary:
        "The destination signs a change_trust for USDC; the sender can sponsor its 0.5 XLM reserve (CAP-33), but the destination's signature is still required.",
      requiredAuthority: 'account_signer',
      estimatedCostXlm: 0.5,
      roadmapNote: ROADMAP_NOTE,
    });
  });

  it('builds a claimable balance plan for the destination', () => {
    const plan = alternativePlan(input(['op_no_destination'], USDC, '25', MISSING));
    expect(plan?.handoff.summary).toContain(`claimable balance of 25 USDC for ${MISSING}`);
    expect(plan?.handoff.requiredAuthority).toBe('account_signer');
    expect(plan?.planId).toMatch(/^preflight-claimable_balance-[0-9a-f]{8}$/);
  });

  it('builds a create_account plan for XLM to a missing destination', () => {
    const plan = alternativePlan(input(['op_no_destination'], 'XLM', '5', MISSING));
    expect(plan?.title).toBe(`Create and fund ${MISSING} with 5 XLM`);
    expect(plan?.handoff.summary).toContain('create_account');
    expect(plan?.handoff.estimatedCostXlm).toBeUndefined();
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
