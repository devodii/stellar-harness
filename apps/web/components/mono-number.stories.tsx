import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { formatPercent, formatXlm } from '@/lib/format';
import { MonoNumber } from './mono-number';

const meta: Meta<typeof MonoNumber> = {
  component: MonoNumber,
  title: 'components/MonoNumber',
  args: { value: 1234567 },
};
export default meta;

type Story = StoryObj<typeof MonoNumber>;

export const Integer: Story = {};

export const Percent: Story = { args: { value: 0.4217, format: (n) => formatPercent(n) } };

export const Xlm: Story = { args: { value: 0.0123456, format: formatXlm } };

export const Missing: Story = { args: { value: null } };
