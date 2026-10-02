import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatLabel } from './stat';

const meta: Meta<typeof StatLabel> = {
  component: StatLabel,
  title: 'components/StatLabel',
  args: { children: 'proposed actions' },
};
export default meta;

type Story = StoryObj<typeof StatLabel>;

export const Default: Story = {};
