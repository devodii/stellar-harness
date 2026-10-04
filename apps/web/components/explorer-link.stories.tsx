import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { ExplorerLink } from './explorer-link';
import { fakeContract } from './story-ids';

const meta: Meta<typeof ExplorerLink> = {
  component: ExplorerLink,
  title: 'components/ExplorerLink',
  args: { kind: 'contract', id: fakeContract('escrow') },
};
export default meta;

type Story = StoryObj<typeof ExplorerLink>;

export const Contract: Story = {
  play: async ({ canvasElement, args }) => {
    const link = within(canvasElement).getByRole('link');
    await expect(link).toHaveAttribute(
      'href',
      `https://stellar.expert/explorer/public/contract/${args.id}`,
    );
    await expect(link).toHaveAttribute('title', String(args.id));
  },
};
export const Ledger: Story = { args: { kind: 'ledger', id: 64_723_488 } };
export const Labelled: Story = { args: { label: '1e00a0b9…' } };
