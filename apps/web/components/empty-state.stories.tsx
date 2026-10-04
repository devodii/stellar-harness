import { DatabaseIcon } from '@phosphor-icons/react/ssr';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { EmptyState } from './empty-state';
import { Button } from './ui/button';

const meta: Meta<typeof EmptyState> = {
  component: EmptyState,
  title: 'components/EmptyState',
  args: { icon: DatabaseIcon, title: 'No findings yet' },
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {};

export const WithDescription: Story = {
  args: { description: 'Run the scanner to populate findings.' },
};

export const WithAction: Story = {
  args: {
    description: 'Run the scanner to populate findings.',
    action: <Button type="button">Clear filters</Button>,
  },
};

export const WithoutIcon: Story = { args: { icon: undefined } };
