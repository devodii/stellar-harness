import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Timeline, type TimelineEntry, type TimelineTone } from './timeline';

type Event = { id: string; label: string; detail: string; tone: TimelineTone; ledger: number };

const events: Event[] = [
  {
    id: 'a',
    label: 'read',
    detail: 'Read current instance and code TTL',
    tone: 'done',
    ledger: 64_723_480,
  },
  {
    id: 'b',
    label: 'simulate',
    detail: 'Simulate ExtendFootprintTTL for 365 days',
    tone: 'pending',
    ledger: 64_723_481,
  },
  {
    id: 'c',
    label: 'build',
    detail: 'Build the unsigned transaction',
    tone: 'pending',
    ledger: 64_723_482,
  },
  {
    id: 'd',
    label: 'submit',
    detail: 'Submit after approval',
    tone: 'blocked',
    ledger: 64_723_483,
  },
];

const renderEvent = (event: Event): TimelineEntry => ({
  key: event.id,
  title: event.label,
  meta: event.tone,
  tone: event.tone,
  content: event.detail,
  data: { ledger: event.ledger, contractId: 'CDZY…YNQC' },
});

const meta: Meta<typeof Timeline<Event>> = {
  component: Timeline,
  title: 'components/Timeline',
  args: { items: events, renderItem: renderEvent },
};
export default meta;

type Story = StoryObj<typeof Timeline<Event>>;

export const Default: Story = {};

export const Collapsed: Story = {
  args: { limit: 2 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /show 2 more/i }));
    await expect(canvas.getByText('Submit after approval')).toBeVisible();
  },
};

export const Loading: Story = { args: { isLoading: true } };

export const Empty: Story = { args: { items: [], emptyMessage: 'No steps yet' } };
