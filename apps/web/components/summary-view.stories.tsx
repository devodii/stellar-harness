import { emptySummary, type Summary } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SummaryView } from './summary-view';

const SNAPSHOT = {
  snapshotLedger: 1000001,
  snapshotTime: '2026-01-08T00:00:00.000Z',
  ledgerCloseSeconds: 5.9,
  gitSha: 'abcdef0123456',
  network: 'mainnet' as const,
};

const EMPTY = emptySummary(SNAPSHOT);

const FILLED: Summary = {
  ...EMPTY,
  contracts: {
    ...EMPTY.contracts,
    total: 5000,
    archivedInstances: 120,
    archivedMeaningful: 9,
    expiring30d: 44,
    expiring30dMeaningful: 3,
  },
  failures: {
    ...EMPTY.failures,
    windowStart: '2026-01-01T00:00:00.000Z',
    txScanned: 900000,
    txFailed: 90000,
    preventable: {
      total: 36000,
      byCode: { tx_bad_seq: 20000, op_underfunded: 10000, op_no_trust: 6000 },
    },
    clusters: { count: 75, anchorDistribution: 4, domains: [] },
  },
  anchors: { ...EMPTY.anchors, domainsTested: 80, failing: [] },
  rent: { ...EMPTY.rent, contractsEstimated: 2000, totalXlm12m: 1234.5 },
};

const meta: Meta<typeof SummaryView> = {
  component: SummaryView,
  title: 'renderers/SummaryView',
  args: { summary: FILLED },
};
export default meta;

type Story = StoryObj<typeof SummaryView>;

export const WithScan: Story = {};

export const NoScanData: Story = { args: { summary: EMPTY } };
