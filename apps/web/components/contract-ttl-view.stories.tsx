import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ContractTtlView as ContractTtlData } from '@/lib/tool-views';
import { ContractTtlView } from './contract-ttl-view';

const TTL: ContractTtlData = {
  contractId: 'CFAKECONTRACTFORSTORYBOOK0000000000000000000000000000ABC',
  wasmHash: 'b'.repeat(64),
  instance: {
    present: true,
    liveUntilLedgerSeq: 1300000,
    ledgersLeft: 300000,
    daysLeft: 20.8,
    archived: false,
  },
  code: {
    present: true,
    liveUntilLedgerSeq: 3000000,
    ledgersLeft: 2000000,
    daysLeft: 138.9,
    archived: false,
  },
  invocations: 4210,
  snapshotLedger: 1000000,
  ledgerCloseSeconds: 6,
};

const meta: Meta<typeof ContractTtlView> = {
  component: ContractTtlView,
  title: 'renderers/ContractTtlView',
  args: { ttl: TTL },
};
export default meta;

type Story = StoryObj<typeof ContractTtlView>;

export const ExpiringSoon: Story = {};

export const Archived: Story = {
  args: {
    ttl: {
      ...TTL,
      instance: {
        present: true,
        liveUntilLedgerSeq: 900000,
        ledgersLeft: -100000,
        daysLeft: null,
        archived: true,
      },
      invocations: null,
    },
  },
};

export const Healthy: Story = {
  args: { ttl: { ...TTL, instance: { ...TTL.code } } },
};
