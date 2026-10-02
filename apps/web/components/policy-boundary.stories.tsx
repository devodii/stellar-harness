import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PolicyBoundary } from './policy-boundary';

const meta: Meta<typeof PolicyBoundary> = {
  component: PolicyBoundary,
  title: 'components/PolicyBoundary',
  args: {
    boundary: {
      rule: 'spend.xlm <= 5',
      reason: 'Estimated rent exceeds the spend cap, so a human must approve.',
      requested: '12.5 XLM',
      threshold: '5 XLM',
    },
  },
};
export default meta;

type Story = StoryObj<typeof PolicyBoundary>;

export const SpendCap: Story = {};

export const RuleOnly: Story = {
  args: {
    boundary: {
      rule: 'step.kind == submit',
      reason: 'Any submit step requires approval in the demo.',
    },
  },
};
