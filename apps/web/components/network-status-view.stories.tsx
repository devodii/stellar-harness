import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { NetworkStatusView } from './network-status-view';

const meta: Meta<typeof NetworkStatusView> = {
  component: NetworkStatusView,
  title: 'components/NetworkStatusView',
  args: {
    status: {
      network: 'mainnet',
      latestLedger: 64_736_900,
      closedAt: '2026-10-02T19:05:01.000Z',
      protocolVersion: 29,
      rpc: { status: 'healthy', oldestLedger: 64_615_941, retentionLedgers: 120_960 },
      horizon: { ok: true, latestLedger: 64_736_899, lagLedgers: 1 },
    },
  },
};
export default meta;

type Story = StoryObj<typeof NetworkStatusView>;

export const Mainnet: Story = {};

export const TestnetHorizonDown: Story = {
  args: {
    status: {
      network: 'testnet',
      latestLedger: 4_980_120,
      closedAt: '2026-10-02T19:05:03.000Z',
      protocolVersion: 29,
      rpc: { status: 'healthy', oldestLedger: 4_859_161, retentionLedgers: 120_960 },
      horizon: { ok: false, latestLedger: null, lagLedgers: null },
    },
  },
};
