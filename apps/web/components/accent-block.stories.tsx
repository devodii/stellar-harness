import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AccentBlock } from './accent-block';

const meta: Meta<typeof AccentBlock> = {
  component: AccentBlock,
  title: 'components/AccentBlock',
  args: {
    label: 'suggested action',
    children: <p className="text-sm">Extend instance TTL (ExtendFootprintTTL) to 12 months.</p>,
  },
};
export default meta;

type Story = StoryObj<typeof AccentBlock>;

export const Primary: Story = {};

export const Warning: Story = {
  args: {
    tone: 'warning',
    label: 'policy',
    aside: <code className="font-mono text-xs">spend.xlm &lt;= 5</code>,
  },
};

export const Destructive: Story = {
  args: {
    tone: 'destructive',
    label: 'op_no_trust',
    children: <p className="text-sm">Destination has no trustline.</p>,
  },
};

export const Muted: Story = { args: { tone: 'muted', label: undefined } };
