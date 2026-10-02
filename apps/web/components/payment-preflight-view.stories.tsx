import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { PaymentPreflightView as PaymentPreflightData } from '@/lib/tool-views';
import { PaymentPreflightView } from './payment-preflight-view';

const FROM = 'GFAKESENDERFORSTORYBOOK0000000000000000000000000000SEND';
const TO = 'GFAKERECEIVERFORSTORYBOOK00000000000000000000000000RECV';

const BLOCKED: PaymentPreflightData = {
  ok: false,
  blockers: [
    {
      code: 'op_no_trust',
      fix: 'Sponsor a USDX trustline for the destination (CAP-33) or send a claimable balance.',
    },
  ],
  checks: [
    { name: 'source_exists', ok: true, detail: 'source account found' },
    { name: 'destination_exists', ok: true, detail: 'destination account found' },
    { name: 'source_trustline', ok: true, detail: 'source holds USDX' },
    { name: 'destination_trustline', ok: false, detail: 'destination has no USDX trustline' },
    { name: 'source_balance', ok: true, detail: '250 USDX available' },
    { name: 'source_reserve', ok: true, detail: 'reserve covered' },
  ],
  alternative: {
    planId: 'plan-preflight-story',
    title: 'Sponsor destination trustline, then pay',
    subject: TO,
    requiresApproval: true,
    estimatedCostXlm: 0.5,
    boundary: {
      rule: 'step.kind == submit',
      reason: 'Submitting requires approval in the demo.',
    },
    steps: [
      {
        id: 's1',
        kind: 'build',
        description: 'Build begin_sponsoring, change_trust, end_sponsoring',
        tool: 'buildPaymentPreflight',
        args: { from: FROM, to: TO, asset: 'USDX', amount: '25' },
        status: 'pending',
      },
      {
        id: 's2',
        kind: 'submit',
        description: 'Submit after approval',
        tool: 'submit',
        args: {},
        status: 'blocked',
      },
    ],
  },
};

const meta: Meta<typeof PaymentPreflightView> = {
  component: PaymentPreflightView,
  title: 'renderers/PaymentPreflightView',
  args: { preflight: BLOCKED, onDecide: fn() },
};
export default meta;

type Story = StoryObj<typeof PaymentPreflightView>;

export const BlockedWithAlternative: Story = {};

export const Clear: Story = {
  args: {
    preflight: {
      ok: true,
      blockers: [],
      checks: BLOCKED.checks.map((check) => ({ ...check, ok: true })),
    },
  },
};
