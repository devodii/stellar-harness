import { PlanStepStatus } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatusGlyph } from './status-glyph';

const meta: Meta<typeof StatusGlyph> = {
  component: StatusGlyph,
  title: 'components/StatusGlyph',
  args: { status: 'pending' },
  argTypes: { status: { control: 'select', options: PlanStepStatus.options } },
};
export default meta;

type Story = StoryObj<typeof StatusGlyph>;

export const Pending: Story = {};

export const AllStatuses: Story = {
  render: () => (
    <ul className="space-y-1 font-mono text-xs">
      {PlanStepStatus.options.map((status) => (
        <li key={status} className="flex items-center gap-2">
          <StatusGlyph status={status} />
          {status}
        </li>
      ))}
    </ul>
  ),
};
