import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BracketTag } from './bracket-tag';
import { ResultCard } from './result-card';

const meta: Meta<typeof ResultCard> = {
  component: ResultCard,
  title: 'components/ResultCard',
  args: {
    title: 'getAccount',
    children: <p className="text-muted-foreground">Synthetic result body.</p>,
  },
};
export default meta;

type Story = StoryObj<typeof ResultCard>;

export const Default: Story = {};

export const WithAside: Story = {
  args: { aside: <BracketTag label="ok" tone="success" /> },
};

export const WithFooter: Story = {
  args: { footer: 'snapshot ledger 1000001' },
};
