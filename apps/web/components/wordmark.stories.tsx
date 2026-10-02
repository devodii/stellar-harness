import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Wordmark } from './wordmark';

const meta: Meta<typeof Wordmark> = {
  component: Wordmark,
  title: 'shell/Wordmark',
};
export default meta;

type Story = StoryObj<typeof Wordmark>;

export const Default: Story = {};

export const Large: Story = { args: { className: 'text-4xl' } };
