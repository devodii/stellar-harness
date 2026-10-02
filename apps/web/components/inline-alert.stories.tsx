import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { InlineAlert } from './inline-alert';

const meta: Meta<typeof InlineAlert> = {
  component: InlineAlert,
  title: 'components/InlineAlert',
};
export default meta;

type Story = StoryObj<typeof InlineAlert>;

export const Neutral: Story = {
  args: { children: 'No scan data yet. Numbers fill in once the scanner has run.' },
};

export const Warning: Story = {
  args: { tone: 'warning', title: 'Upstream slow', children: 'Horizon responded after 4.2s.' },
};

export const Destructive: Story = {
  args: {
    tone: 'destructive',
    title: 'Chat unavailable',
    children: 'OPENAI_API_KEY is not set.',
  },
};

export const Success: Story = { args: { tone: 'success', children: 'Simulation succeeded.' } };

export const DismissesOnClick: Story = {
  args: { tone: 'warning', dismissible: true, children: 'Dismiss me.' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss' }));
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
  },
};
