import type { Plan } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { fn } from 'storybook/test';
import type { PlanDecision } from '@/lib/plan-approval';
import { PlanView } from './plan-view';

const FAKE_CONTRACT = 'CFAKECONTRACTFORSTORYBOOK0000000000000000000000000000ABC';

const PLAN: Plan = {
  planId: 'plan-story-1',
  title: 'Extend instance TTL to 12 months',
  subject: FAKE_CONTRACT,
  requiresApproval: true,
  estimatedCostXlm: 12.5,
  boundary: {
    rule: 'spend.xlm <= 5',
    reason: 'Estimated rent exceeds the spend cap.',
    requested: '12.5 XLM',
    threshold: '5 XLM',
  },
  steps: [
    {
      id: 's1',
      kind: 'read',
      description: 'Read current instance and code TTL',
      tool: 'getContractTtl',
      args: { contractId: FAKE_CONTRACT },
      status: 'done',
    },
    {
      id: 's2',
      kind: 'simulate',
      description: 'Simulate ExtendFootprintTTL for 365 days',
      tool: 'simulateExtendTtl',
      args: { contractId: FAKE_CONTRACT, days: 365 },
      status: 'pending',
    },
    {
      id: 's3',
      kind: 'build',
      description: 'Build the unsigned transaction',
      tool: 'simulateExtendTtl',
      args: { contractId: FAKE_CONTRACT, days: 365 },
      status: 'pending',
    },
    {
      id: 's4',
      kind: 'submit',
      description: 'Submit after approval',
      tool: 'submit',
      args: {},
      status: 'blocked',
    },
  ],
};

const meta: Meta<typeof PlanView> = {
  component: PlanView,
  title: 'components/PlanView',
  args: { plan: PLAN, onDecide: fn() },
};
export default meta;

type Story = StoryObj<typeof PlanView>;

export const AwaitingApproval: Story = {};

export const Approved: Story = { args: { decision: 'approve' } };

export const Declined: Story = { args: { decision: 'decline' } };

export const NoApprovalNeeded: Story = {
  args: {
    plan: {
      ...PLAN,
      requiresApproval: false,
      boundary: undefined,
      steps: PLAN.steps.slice(0, 2),
    },
  },
};

function InteractiveDemo() {
  const [decision, setDecision] = React.useState<PlanDecision>();
  return <PlanView plan={PLAN} decision={decision} onDecide={(_id, next) => setDecision(next)} />;
}

export const Interactive: Story = { render: () => <InteractiveDemo /> };
