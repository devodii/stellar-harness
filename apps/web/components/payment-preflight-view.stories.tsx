import { ok, ROADMAP_NOTE } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { PaymentPreflightView as PaymentPreflightData } from '@/lib/tool-views';
import { ConnectSheetProvider } from './connect-sheet';
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
    title: 'Sponsor the destination trustline, then pay',
    subject: TO,
    steps: [
      {
        id: 's1',
        kind: 'read',
        description: 'Read both accounts, trustlines and reserves',
        tool: 'buildPaymentPreflight',
        args: { from: FROM, to: TO },
        status: 'done',
      },
      {
        id: 's2',
        kind: 'handoff',
        description: 'Hand the sponsored trustline to the destination signer',
        tool: 'handoff',
        args: {},
        status: 'pending',
      },
    ],
    handoff: {
      summary:
        'The destination signer co-signs a sponsored USDX trustline (CAP-33), then the payment can land.',
      requiredAuthority: 'account_signer',
      estimatedCostXlm: 0.5,
      roadmapNote: ROADMAP_NOTE,
    },
  },
};

const meta: Meta<typeof PaymentPreflightView> = {
  component: PaymentPreflightView,
  title: 'renderers/PaymentPreflightView',
  args: { preflight: BLOCKED },
  decorators: [
    (Story) => (
      <ConnectSheetProvider requestPilot={fn(async () => ok({ count: 2 }))}>
        <Story />
      </ConnectSheetProvider>
    ),
  ],
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
