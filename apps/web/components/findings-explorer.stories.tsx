import { type Finding, SUGGESTED_ACTION } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
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
    finding(1, {
      severity: 'critical',
      type: 'CONTRACT_CODE_ARCHIVED',
      subjectKind: 'contract',
      tags: ['scf_funded'],
    }),
    finding(2),
    finding(3, { severity: 'medium', type: 'TX_TOO_LATE_CLUSTER' }),
  ],
  total: 3,
  limit: FINDINGS_PAGE_SIZE,
  offset: 0,
};

const MEANINGFUL: FindingsResponse = { ...PAGE, rows: PAGE.rows.slice(0, 1), total: 1 };

const NO_FILTER = { type: [], severity: [], tag: '' };
const keyFor = (scope: 'meaningful' | 'all') =>
  findingsQueryKey('mainnet', NO_FILTER, 0, FINDINGS_PAGE_SIZE, scope);

type Args = { meaningful: FindingsResponse; all: FindingsResponse };

const meta: Meta<Args> = {
  title: 'pages/FindingsExplorer',
  args: { meaningful: MEANINGFUL, all: PAGE },
  render: ({ meaningful, all }) => (
    <QueryStory
      seed={[
        [keyFor('meaningful'), meaningful],
        [keyFor('all'), all],
      ]}
    >
      <FindingsExplorer />
    </QueryStory>
  ),
};
export default meta;

type Story = StoryObj<Args>;

export const WithFindings: Story = {};

export const ShowAllToggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/findings that matter/)).toBeVisible();
    await expect(canvas.queryByText('tx_too_late_cluster')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'show all' }));
    await expect(await canvas.findByText('showing every finding')).toBeVisible();
    await expect(await canvas.findByText('tx_too_late_cluster')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'show active only' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};

export const NoScanYet: Story = {
  args: {
    meaningful: { ...PAGE, rows: [], total: 0 },
    all: { ...PAGE, rows: [], total: 0 },
  },
};
