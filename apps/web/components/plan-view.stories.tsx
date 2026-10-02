import { ok, type Plan, ROADMAP_NOTE } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { HANDOFF_HINT, SIMULATE_HINT } from '@/lib/plan-copy';
import { ConnectSheetProvider } from './connect-sheet';
import { PlanView } from './plan-view';
import { fakeContract } from './story-ids';

const CONTRACT = fakeContract('plan');

const PLAN: Plan = {
  planId: 'plan-story-1',
  title: 'Extend instance TTL to 12 months',
  subject: CONTRACT,
  steps: [
    {
      id: 's1',
      kind: 'read',
      description: 'Read current instance and code TTL',
      tool: 'getContractTtl',
      args: { contractId: CONTRACT },
      status: 'done',
    },
    {
      id: 's2',
      kind: 'simulate',
      description: 'Simulate ExtendFootprintTTL for 365 days',
      tool: 'simulateExtendTtl',
      args: { contractId: CONTRACT, days: 365 },
      status: 'done',
    },
    {
      id: 's3',
      kind: 'handoff',
      description: 'Hand the extension to whoever pays for it',
      tool: 'handoff',
      args: {},
      status: 'pending',
    },
  ],
  handoff: {
    summary:
      'Anyone can pay to extend the instance and wasm TTL by 365 days; the contract admin decides whether it is worth keeping.',
    requiredAuthority: 'any_payer',
    estimatedCostXlm: 1.8350421,
    roadmapNote: ROADMAP_NOTE,
  },
};

const meta: Meta<typeof PlanView> = {
  component: PlanView,
  title: 'components/PlanView',
  args: { plan: PLAN },
  decorators: [
    (Story) => (
      <ConnectSheetProvider requestPilot={fn(async () => ok({ count: 9 }))}>
        <div className="max-w-2xl">
          <Story />
        </div>
      </ConnectSheetProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof PlanView>;

export const ReadSimulateHandoff: Story = {};

export const SimulationFailed: Story = {
  args: {
    plan: {
      ...PLAN,
      steps: PLAN.steps.map((step) => (step.id === 's2' ? { ...step, status: 'error' } : step)),
      handoff: { ...PLAN.handoff, estimatedCostXlm: undefined },
    },
  },
};

export const AnchorOperator: Story = {
  args: {
    plan: {
      planId: 'plan-story-anchor',
      title: 'Fix the SEP-10 signing key',
      subject: 'anchor.example.org',
      steps: [
        {
          id: 's1',
          kind: 'read',
          description: 'Probe stellar.toml and the SEP-10 challenge',
          tool: 'probeAnchor',
          args: { domain: 'anchor.example.org' },
          status: 'done',
        },
        {
          id: 's2',
          kind: 'handoff',
          description: 'Hand the fix to the anchor operator',
          tool: 'handoff',
          args: {},
          status: 'pending',
        },
      ],
      handoff: {
        summary: 'The anchor operator must publish a SIGNING_KEY that signs the SEP-10 challenge.',
        requiredAuthority: 'anchor_operator',
        roadmapNote: ROADMAP_NOTE,
      },
    },
  },
};

export const Collapsed: Story = { args: { defaultOpen: false } };

export const ExplainsSteps: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    await expect(canvas.getByText('[read]')).toBeVisible();
    await expect(canvas.getByText('[handoff]')).toBeVisible();
    await expect(canvas.getByText(ROADMAP_NOTE)).toBeVisible();
    await expect(canvas.getByText(/est\. 1\.8350421 XLM/)).toBeVisible();
    await expect(canvas.queryByRole('button', { name: /approve|decline/i })).toBeNull();
    await userEvent.hover(canvas.getByText('[simulate]'));
    await expect(await page.findByRole('tooltip')).toHaveTextContent(SIMULATE_HINT);
    await userEvent.unhover(canvas.getByText('[simulate]'));
    await userEvent.hover(canvas.getByRole('region', { name: 'handoff' }));
    await expect(await page.findByRole('tooltip', {}, { timeout: 2000 })).toHaveTextContent(
      HANDOFF_HINT,
    );
  },
};
