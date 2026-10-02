import { describe, expect, it } from 'vitest';
import { firstUserText, type HarnessUIMessage, planDecisions } from './chat';
import { approvalText, planApproval } from './plan-approval';

const approval = (
  id: string,
  planId: string,
  decision: 'approve' | 'decline',
): HarnessUIMessage => {
  const data = planApproval(planId, decision);
  return {
    id,
    role: 'user',
    parts: [
      { type: 'text', text: approvalText(data) },
      { type: 'data-plan-approval', data },
    ],
  };
};

describe('chat helpers', () => {
  it('collects the latest decision per plan', () => {
    const messages = [approval('1', 'p1', 'approve'), approval('2', 'p2', 'decline')];
    expect(planDecisions(messages)).toEqual({ p1: 'approve', p2: 'decline' });
  });

  it('ignores approvals that are not from the user', () => {
    const message = { ...approval('1', 'p1', 'approve'), role: 'assistant' as const };
    expect(planDecisions([message])).toEqual({});
  });

  it('reads the first text part', () => {
    expect(firstUserText(approval('1', 'p9', 'approve'))).toBe('Approve plan p9 (demo).');
    expect(firstUserText(undefined)).toBeNull();
  });
});
