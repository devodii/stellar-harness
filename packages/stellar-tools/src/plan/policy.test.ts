import type { PlanStep } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { evaluatePolicy, readPolicy } from './policy';

const step = (kind: PlanStep['kind']): PlanStep => ({
  id: kind,
  kind,
  description: kind,
  tool: 'getAccount',
  args: {},
  status: 'pending',
});

const policy = { spendCapXlm: 5 };

describe('readPolicy', () => {
  it('defaults the spend cap to 5 XLM', () => {
    expect(readPolicy({})).toEqual({ spendCapXlm: 5 });
  });

  it('reads a decimal cap from the environment', () => {
    expect(readPolicy({ POLICY_SPEND_CAP_XLM: '2.5' })).toEqual({ spendCapXlm: 2.5 });
  });

  it('fails loudly on an invalid cap', () => {
    expect(() => readPolicy({ POLICY_SPEND_CAP_XLM: '-1' })).toThrow(/POLICY_SPEND_CAP_XLM/);
  });
});

describe('evaluatePolicy', () => {
  it('lets read and simulate plans under the cap through', () => {
    const decision = evaluatePolicy(
      { steps: [step('read'), step('simulate')], estimatedCostXlm: 1 },
      policy,
    );
    expect(decision).toEqual({ requiresApproval: false });
  });

  it('always requires approval for a submit step', () => {
    const decision = evaluatePolicy({ steps: [step('build'), step('submit')] }, policy);
    expect(decision.requiresApproval).toBe(true);
    expect(decision.boundary?.rule).toBe('submit_requires_approval');
    expect(decision.boundary?.requested).toBe('1 submission');
  });

  it('flags spend above the cap with threshold and requested amounts', () => {
    const decision = evaluatePolicy({ steps: [step('submit')], estimatedCostXlm: 7.25 }, policy);
    expect(decision).toEqual({
      requiresApproval: true,
      boundary: expect.objectContaining({
        rule: 'spend_cap',
        threshold: '5 XLM',
        requested: '7.25 XLM',
      }),
    });
  });

  it('treats a cost equal to the cap as within policy', () => {
    expect(evaluatePolicy({ steps: [], estimatedCostXlm: 5 }, policy).requiresApproval).toBe(false);
  });
});
