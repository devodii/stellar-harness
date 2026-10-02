import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { SwipeToReply } from './swipe-to-reply';

const meta: Meta<typeof SwipeToReply> = {
  component: SwipeToReply,
  title: 'components/SwipeToReply',
  args: {
    onReply: fn(),
    children: (
      <p className="max-w-md text-sm">
        The instance expires in 12 days. Drag this message to the right, or hover and press reply.
      </p>
    ),
  },
};
export default meta;

type Story = StoryObj<typeof SwipeToReply>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /reply/i }));
    await expect(args.onReply).toHaveBeenCalledOnce();
  },
};

export const Disabled: Story = { args: { disabled: true } };
