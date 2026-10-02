import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { SIMULATE_HINT } from '@/lib/plan-copy';
import type { ExtendTtlView } from '@/lib/tool-views';
import { SimulationCostView } from './simulation-cost-view';

const CONTRACT = 'CFAKECONTRACTFORSTORYBOOK0000000000000000000000000000ABC';

const EXTEND: ExtendTtlView = {
  contractId: CONTRACT,
  minResourceFeeStroops: 18_350_421,
  estimatedXlm: 1.8350421,
  operation:
    'Extend the TTL of the contract instance and its wasm code to 365 days (ExtendFootprintTTL)',
  footprint: { readOnly: ['instance-key', 'code-key'], readWrite: [] },
  days: 365,
  extendToLedgers: 5_256_000,
};

const meta: Meta<typeof SimulationCostView> = {
  component: SimulationCostView,
  title: 'renderers/SimulationCostView',
  args: { simulation: EXTEND },
};
export default meta;

type Story = StoryObj<typeof SimulationCostView>;

export const ExtendTwelveMonths: Story = {};

export const WithUsd: Story = { args: { xlmUsd: 0.12 } };

export const Restore: Story = {
  args: {
    simulation: {
      contractId: CONTRACT,
      minResourceFeeStroops: 4_200_000,
      estimatedXlm: 0.42,
      operation: 'Restore the archived contract instance and its wasm code (RestoreFootprint)',
      footprint: { readOnly: [], readWrite: ['instance-key', 'code-key'] },
      entries: 'both',
    },
  },
};

export const ExplainsSimulation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/ExtendFootprintTTL/)).toBeVisible();
    await expect(canvas.queryByText(/xdr/i)).toBeNull();
    await userEvent.hover(canvas.getByText('[simulated]'));
    await expect(await within(document.body).findByRole('tooltip')).toHaveTextContent(
      SIMULATE_HINT,
    );
  },
};
