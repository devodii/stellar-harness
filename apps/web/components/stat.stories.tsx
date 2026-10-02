import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { formatPercent } from '@/lib/format';
import { Stat } from './stat';

const meta: Meta<typeof Stat> = {
  component: Stat,
  title: 'components/Stat',
  args: { label: 'failed tx', value: 48213 },
};
export default meta;

type Story = StoryObj<typeof Stat>;

export const Default: Story = {};

export const WithHint: Story = { args: { hint: 'last 7 days' } };

export const Destructive: Story = {
  args: { label: 'preventable', value: 0.62, format: (n) => formatPercent(n), tone: 'destructive' },
};

export const Small: Story = { args: { size: 'sm' } };

export const Missing: Story = { args: { label: 'close time', value: null } };
