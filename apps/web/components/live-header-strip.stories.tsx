import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { LiveResponse } from '@/lib/api-schemas';
import { LiveHeaderStrip } from './live-header-strip';
import { QueryStory } from './query-story';

const SCANNED: LiveResponse = {
  network: 'mainnet',
  latestLedger: 1000001,
  closedAt: '2026-01-01T00:00:00Z',
  ledgerSource: 'horizon',
  ledgerCloseSeconds: 5.9,
  window: { days: 7, txFailed: 120345, preventable: 49000, preventableShare: 0.41 },
  archivedContracts: 812,
  anchorsFailing: 17,
  scanned: true,
  horizonOk: true,
};

const NO_SCAN: LiveResponse = {
  ...SCANNED,
  ledgerCloseSeconds: null,
  window: { days: 0, txFailed: null, preventable: null, preventableShare: null },
  archivedContracts: null,
  anchorsFailing: null,
  scanned: false,
};

const meta: Meta<{ live: LiveResponse }> = {
  title: 'shell/LiveHeaderStrip',
  args: { live: SCANNED },
  render: ({ live }) => (
    <QueryStory seed={[[['live'], live]]}>
      <LiveHeaderStrip />
    </QueryStory>
  ),
};
export default meta;

type Story = StoryObj<{ live: LiveResponse }>;

export const Scanned: Story = {};

export const NoScanData: Story = { args: { live: NO_SCAN } };

export const HorizonDownRpcUp: Story = {
  args: { live: { ...NO_SCAN, network: 'testnet', ledgerSource: 'rpc', horizonOk: false } },
};

export const AllSourcesDown: Story = {
  args: {
    live: { ...NO_SCAN, latestLedger: null, closedAt: null, ledgerSource: null, horizonOk: false },
  },
};
