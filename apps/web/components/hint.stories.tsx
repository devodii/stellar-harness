import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { HANDOFF_HINT } from '@/lib/plan-copy';
import { BracketTag } from './bracket-tag';
import { Hint } from './hint';

const meta: Meta<typeof Hint> = {
  component: Hint,
  title: 'components/Hint',
  args: {
    hint: HANDOFF_HINT,
    children: <BracketTag label="handoff" tone="warning" tabIndex={0} />,
  },
};
export default meta;

type Story = StoryObj<typeof Hint>;

export const Default: Story = {};

export const OpensOnFocus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(canvas.getByText('[handoff]')).toHaveFocus();
    await expect(await within(document.body).findByRole('tooltip')).toHaveTextContent(HANDOFF_HINT);
  },
};
