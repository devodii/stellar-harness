import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ChatComposer } from './chat-composer';

const meta: Meta<typeof ChatComposer> = {
  component: ChatComposer,
  title: 'chat/ChatComposer',
  args: { onSubmit: fn(), onStop: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ChatComposer>;

export const Ready: Story = {};

export const Submitted: Story = { args: { status: 'submitted' } };

export const Streaming: Story = { args: { status: 'streaming' } };

export const Disabled: Story = { args: { disabled: true } };
