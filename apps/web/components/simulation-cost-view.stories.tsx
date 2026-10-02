import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ExtendTtlView } from '@/lib/tool-views';
import { SimulationCostView } from './simulation-cost-view';

const CONTRACT = 'CFAKECONTRACTFORSTORYBOOK0000000000000000000000000000ABC';

const EXTEND: ExtendTtlView = {
  contractId: CONTRACT,
  minResourceFeeStroops: 18_350_421,
  estimatedXlm: 1.8350421,
  unsignedXdr: 'AAAAAgAAAABGQUtFWERSRk9SU1RPUllCT09LT05MWQ==',
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
      unsignedXdr: 'AAAAAgAAAABSRVNUT1JFRkFLRVhEUg==',
      footprint: { readOnly: [], readWrite: ['instance-key', 'code-key'] },
      entries: 'both',
    },
  },
};
