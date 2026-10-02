import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BracketTag } from './bracket-tag';
import { ResultSection } from './result-section';

const meta: Meta<typeof ResultSection> = {
  component: ResultSection,
  title: 'components/ResultSection',
  args: {
    title: 'getAccount',
    children: <p className="text-muted-foreground">Synthetic result body.</p>,
  },
};
export default meta;

type Story = StoryObj<typeof ResultSection>;

export const Default: Story = {};

export const WithAside: Story = {
  args: { aside: <BracketTag label="ok" tone="success" /> },
};

export const WithFooter: Story = {
  args: { footer: 'snapshot ledger 1000001' },
};
