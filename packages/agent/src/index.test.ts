import { MemoryStorage } from '@harness/storage';
import { describe, expect, it } from 'vitest';
import { APPROVAL_NOTE, createAgentTools, planProtocol, systemPrompt } from './index';

describe('@harness/agent', () => {
  it('exports the agent surface', () => {
    expect(typeof systemPrompt).toBe('string');
    expect(APPROVAL_NOTE).toContain('passkey signature');
    const tools = createAgentTools({
      storage: new MemoryStorage(),
      policy: { spendCapXlm: 5 },
      stellarlight: { get: async () => ({}) },
    });
    expect(Object.keys(tools).sort()).toEqual([
      'explainFailure',
      'getSummary',
      'planFix',
      'queryFindings',
      'searchEcosystem',
    ]);
  });

  it('exposes the plan protocol as one object', () => {
    expect(planProtocol.initialState).toBe('proposed');
    expect(planProtocol.transition('awaiting_approval', 'approve')).toEqual({
      ok: true,
      value: 'approved',
    });
    expect(
      planProtocol.schemas.PlanApproval.safeParse({
        type: 'plan-approval',
        planId: 'plan_1',
        decision: 'approve',
      }).success,
    ).toBe(true);
  });
});
