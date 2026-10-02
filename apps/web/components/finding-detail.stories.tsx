import { SUGGESTED_ACTION } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FindingDetail } from './finding-detail';

const meta: Meta<typeof FindingDetail> = {
  component: FindingDetail,
  title: 'renderers/FindingDetail',
  args: {
    finding: {
      findingId: 'c'.repeat(64),
      type: 'TX_BAD_SEQ_CLUSTER',
      subjectKind: 'account',
      subject: 'GFAKEACCOUNTFORSTORYBOOK0000000000000000000000000000ACC',
      severity: 'high',
      evidence: { count: 48, firstLedger: 1000001, lastLedger: 1000999, sameLedgerCollisions: 12 },
      suggestedAction: SUGGESTED_ACTION.TX_BAD_SEQ_CLUSTER,
      snapshotLedger: 1001000,
      observedAt: '2026-01-01T00:00:00.000Z',
      tags: ['channel_pattern', 'multisig'],
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof FindingDetail>;

export const SequenceCluster: Story = {};
