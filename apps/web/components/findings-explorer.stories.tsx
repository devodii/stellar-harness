import { type Finding, SUGGESTED_ACTION } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { findingsQueryKey } from '@/hooks/use-findings';
import { FINDINGS_PAGE_SIZE, type FindingsResponse } from '@/lib/api-schemas';
import { FindingsExplorer } from './findings-explorer';
import { QueryStory } from './query-story';

const finding = (n: number, overrides: Partial<Finding> = {}): Finding => ({
  findingId: n.toString(16).padStart(64, '0'),
  type: 'OP_UNDERFUNDED_CLUSTER',
  subjectKind: 'account',
  subject: `GFAKE${String(n).padStart(3, '0')}ACCOUNTFORSTORYBOOK000000000000000000000000000000`,
  severity: 'high',
  evidence: { count: 10 + n, firstLedger: 1000000 + n },
  suggestedAction: SUGGESTED_ACTION.OP_UNDERFUNDED_CLUSTER,
  snapshotLedger: 1001000,
  observedAt: '2026-01-01T00:00:00.000Z',
  tags: ['contract_caller'],
  ...overrides,
});

const PAGE: FindingsResponse = {
  rows: [
    finding(1, { severity: 'critical', type: 'CONTRACT_CODE_ARCHIVED', subjectKind: 'contract' }),
    finding(2),
    finding(3, { severity: 'medium', type: 'TX_TOO_LATE_CLUSTER' }),
  ],
  total: 3,
  limit: FINDINGS_PAGE_SIZE,
  offset: 0,
};

const KEY = findingsQueryKey('mainnet', { type: [], severity: [], tag: '' }, 0, FINDINGS_PAGE_SIZE);

const meta: Meta<{ page: FindingsResponse }> = {
  title: 'pages/FindingsExplorer',
  args: { page: PAGE },
  render: ({ page }) => (
    <QueryStory seed={[[KEY, page]]}>
      <FindingsExplorer />
    </QueryStory>
  ),
};
export default meta;

type Story = StoryObj<{ page: FindingsResponse }>;

export const WithFindings: Story = {};

export const NoScanYet: Story = { args: { page: { ...PAGE, rows: [], total: 0 } } };
