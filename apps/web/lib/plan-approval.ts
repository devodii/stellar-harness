import { z } from 'zod';

// Mirrors @harness/agent protocol.ts (PlanDecision, PlanApproval, APPROVAL_NOTE). Swap to the
// package exports at merge; the client imports only this pure module, never the agent tools.

export const PlanDecision = z.enum(['approve', 'decline']);
export type PlanDecision = z.infer<typeof PlanDecision>;

export const PlanApproval = z.object({
  type: z.literal('plan-approval'),
  planId: z.string().min(1),
  decision: PlanDecision,
});
export type PlanApproval = z.infer<typeof PlanApproval>;

export const APPROVAL_NOTE =
  "demo: approvals are a UI gesture; in the product this is a passkey signature on an auth entry against the organisation's smart account policy. nothing is signed or broadcast here.";

export const planApproval = (planId: string, decision: PlanDecision): PlanApproval => ({
  type: 'plan-approval',
  planId,
  decision,
});

export const approvalText = ({ planId, decision }: PlanApproval): string =>
  decision === 'approve' ? `Approve plan ${planId} (demo).` : `Decline plan ${planId}.`;
