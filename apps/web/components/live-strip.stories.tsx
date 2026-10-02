import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { formatPercent, formatSeconds } from '@/lib/format';
import { LiveStrip, type LiveStripItem } from './live-strip';

const ITEMS: LiveStripItem[] = [
  { id: 'ledger', label: 'ledger', value: 1000001 },
  { id: 'close', label: 'close', value: 5.9, format: formatSeconds },
  { id: 'failed', label: 'failed 7d', value: 120345, tone: 'destructive' },
  { id: 'preventable', label: 'preventable', value: 0.41, format: (n) => formatPercent(n) },
  { id: 'archived', label: 'archived', value: 812, tone: 'warning' },
  { id: 'anchors', label: 'anchors failing', value: 17 },
];

const meta: Meta<typeof LiveStrip> = {
  component: LiveStrip,
  title: 'components/LiveStrip',
  args: { items: ITEMS, live: true },
};
export default meta;

type Story = StoryObj<typeof LiveStrip>;

export const Default: Story = {};

export const Loading: Story = { args: { loading: true } };

export const NoScanData: Story = {
  args: {
    items: ITEMS.map((item) => (item.id === 'ledger' ? item : { ...item, value: null })),
  },
};

function TickingDemo() {
  const [ledger, setLedger] = React.useState(1000001);
  React.useEffect(() => {
    const id = setInterval(() => setLedger((n) => n + 1), 1500);
    return () => clearInterval(id);
  }, []);
  return (
    <LiveStrip live items={ITEMS.map((i) => (i.id === 'ledger' ? { ...i, value: ledger } : i))} />
  );
}

export const Ticking: Story = { render: () => <TickingDemo /> };
