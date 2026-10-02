import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { ChatContext } from '@/lib/chat-context';
import { ContextChip, ContextChipList } from './context-chip';

const finding: ChatContext = {
  kind: 'finding',
  findingId: 'a'.repeat(64),
  type: 'CONTRACT_INSTANCE_EXPIRING_30D',
  subject: 'CDZYZVZNURK4DCD3ZJMBKLDYCB7FIYL3FRVSLRLGL2BEOIN53UP4YNQC',
  severity: 'high',
  suggestedAction: 'Extend instance TTL (ExtendFootprintTTL) to 12 months within rent budget.',
  snapshotLedger: 64_723_488,
  evidence: { daysLeft: 12 },
};

const meta: Meta<typeof ContextChip> = {
  component: ContextChip,
  title: 'components/ContextChip',
  args: { context: finding },
};
export default meta;

type Story = StoryObj<typeof ContextChip>;

export const Attached: Story = {};

export const Removable: Story = {
  args: { onRemove: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /remove finding/i }));
    await expect(args.onRemove).toHaveBeenCalled();
  },
};

export const Critical: Story = {
  args: { context: { ...finding, type: 'CONTRACT_INSTANCE_ARCHIVED', severity: 'critical' } },
};

const reply: ChatContext = {
  kind: 'reply',
  messageId: 'm1',
  excerpt:
    'The instance expires in 12 days. Extending it to 12 months costs about 49.16 XLM in resource fees; the plan below needs approval because it submits.',
};

export const Reply: Story = { args: { context: reply } };

export const ReplyRemovable: Story = { args: { context: reply, onRemove: fn() } };

export const List: StoryObj<typeof ContextChipList> = {
  render: () => (
    <div className="max-w-md">
      <ContextChipList
        contexts={[finding, { ...finding, findingId: 'b'.repeat(64), severity: 'critical' }]}
        onRemove={() => {}}
      />
    </div>
  ),
};
