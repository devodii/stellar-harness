import { type Plan, PlanState } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import {
  APPROVAL_NOTE,
  applyApproval,
  demoExecutableSteps,
  isTerminal,
  PLAN_EVENTS,
  PLAN_TRANSITIONS,
  type PlanApprovalHooks,
  parsePlanApproval,
  replay,
  transition,
} from './protocol';

describe('transition', () => {
  it('walks the happy path to executed', () => {
    expect(replay(['propose', 'request_approval', 'approve', 'execute'])).toEqual({
      ok: true,
      value: 'executed',
    });
  });

  it('declines from proposed and from awaiting approval', () => {
    expect(transition('proposed', 'decline')).toEqual({ ok: true, value: 'declined' });
    expect(transition('awaiting_approval', 'decline')).toEqual({ ok: true, value: 'declined' });
  });

  it('rejects skipping approval', () => {
    expect(transition('proposed', 'approve')).toMatchObject({
      ok: false,
      error: { code: 'CONFLICT' },
    });
    expect(transition('proposed', 'execute').ok).toBe(false);
    expect(transition('awaiting_approval', 'execute').ok).toBe(false);
  });

  it('treats declined and executed as terminal', () => {
    for (const state of ['declined', 'executed'] as const) {
      expect(isTerminal(state)).toBe(true);
      for (const event of PLAN_EVENTS) expect(transition(state, event).ok).toBe(false);
    }
    expect(isTerminal('approved')).toBe(false);
  });

  it('stops replay at the first invalid event', () => {
    const result = replay(['propose', 'approve', 'execute']);
    expect(result).toMatchObject({
      ok: false,
      error: { meta: { state: 'proposed', event: 'approve' } },
    });
  });

  it('only allows propose on a fresh plan', () => {
    expect(transition('approved', 'propose').ok).toBe(false);
  });

  it('covers every state', () => {
    expect(Object.keys(PLAN_TRANSITIONS).sort()).toEqual([...PlanState.options].sort());
  });
});

describe('plan approval message', () => {
  it('parses an approval object and its json form', () => {
    const approval = { type: 'plan-approval', planId: 'plan_abc', decision: 'approve' };
    expect(parsePlanApproval(approval)).toEqual(approval);
    expect(parsePlanApproval(JSON.stringify(approval))).toEqual(approval);
  });

  it('ignores ordinary chat text and malformed approvals', () => {
    expect(parsePlanApproval('approve it')).toBeNull();
    expect(parsePlanApproval({ type: 'plan-approval', planId: 'p', decision: 'maybe' })).toBeNull();
  });

  it('applies the decision to the plan state', () => {
    const approval = { type: 'plan-approval' as const, planId: 'p', decision: 'decline' as const };
    expect(applyApproval('awaiting_approval', approval)).toEqual({ ok: true, value: 'declined' });
    expect(applyApproval('executed', approval).ok).toBe(false);
  });
});

describe('demo execution', () => {
  it('runs only read and simulate steps', () => {
    const step = (id: string, kind: Plan['steps'][number]['kind']) => ({
      id,
      kind,
      description: id,
      tool: 'getContractTtl',
      args: {},
      status: 'pending' as const,
    });
    const plan: Plan = {
      planId: 'plan_1',
      title: 't',
      subject: 's',
      steps: [
        step('s1', 'read'),
        step('s2', 'simulate'),
        step('s3', 'build'),
        step('s4', 'submit'),
      ],
      requiresApproval: true,
    };
    expect(demoExecutableSteps(plan).map((row) => row.id)).toEqual(['s1', 's2']);
  });
});

describe('approval hooks', () => {
  it('accepts an approve hook without a signature in the demo', async () => {
    const approved: string[] = [];
    const hooks: PlanApprovalHooks = { onApprove: (planId) => void approved.push(planId) };
    await hooks.onApprove('plan_1');
    expect(approved).toEqual(['plan_1']);
  });

  it('states that nothing is signed or broadcast', () => {
    expect(APPROVAL_NOTE).toMatch(/nothing is signed or broadcast here\.$/);
  });
});
