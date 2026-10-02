import type { PlanApproval, PlanDecision } from '@harness/agent/protocol';

export { APPROVAL_NOTE, PlanApproval, PlanDecision } from '@harness/agent/protocol';

export const planApproval = (planId: string, decision: PlanDecision): PlanApproval => ({
  type: 'plan-approval',
  planId,
  decision,
});

export const approvalText = ({ planId, decision }: PlanApproval): string =>
  decision === 'approve' ? `Approve plan ${planId} (demo).` : `Decline plan ${planId}.`;
