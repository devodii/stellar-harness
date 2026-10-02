import { type Finding, SUGGESTED_ACTION } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { FindingsTable } from './findings-table';

const finding = (n: number, overrides: Partial<Finding>): Finding => ({
  findingId: n.toString(16).padStart(64, '0'),
  type: 'OP_NO_TRUST_CLUSTER',
  subjectKind: 'account',
  subject: `GFAKE${String(n).padStart(3, '0')}ACCOUNTFORSTORYBOOK000000000000000000000000000000`,
  severity: 'high',
  evidence: { count: 10 + n },
  suggestedAction: SUGGESTED_ACTION.OP_NO_TRUST_CLUSTER,
  snapshotLedger: 1000001,
  observedAt: '2026-01-01T00:00:00.000Z',
  tags: ['multisig'],
  ...overrides,
});

const ROWS: Finding[] = [
  finding(1, {
    type: 'CONTRACT_INSTANCE_ARCHIVED',
    subjectKind: 'contract',
    subject: 'CFAKECONTRACTFORSTORYBOOK0000000000000000000000000000ABC',
    severity: 'critical',
    tags: ['scf_funded', 'scf:example-project', 'family:large', 'extra'],
  }),
  finding(2, {
    type: 'ANCHOR_INFO_UNREADABLE',
    subjectKind: 'anchor_domain',
    subject: 'anchor.example.org',
    severity: 'critical',
    tags: ['anchor', 'country:xx'],
  }),
  finding(3, { type: 'TX_BAD_SEQ_CLUSTER', severity: 'high', tags: ['channel_pattern'] }),
  finding(4, { type: 'TX_TOO_LATE_CLUSTER', severity: 'medium' }),
  finding(5, { type: 'CONTRACT_LIVE_IDLE', subjectKind: 'contract', severity: 'info', tags: [] }),
];

const meta: Meta<typeof FindingsTable> = {
  component: FindingsTable,
  title: 'renderers/FindingsTable',
  args: { rows: ROWS, onRowClick: fn() },
};
export default meta;

type Story = StoryObj<typeof FindingsTable>;

export const Default: Story = {};

export const Empty: Story = { args: { rows: [] } };

export const Loading: Story = { args: { isLoading: true } };

export const Paginated: Story = {
  args: {
    rows: Array.from({ length: 4 }, () => ROWS)
      .flat()
      .map((row, i) => ({
        ...row,
        findingId: i.toString(16).padStart(64, '0'),
      })),
    clientPageSize: 6,
  },
};
