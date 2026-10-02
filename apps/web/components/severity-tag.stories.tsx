import { SEVERITIES } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SeverityTag } from './severity-tag';

const meta: Meta<typeof SeverityTag> = {
  component: SeverityTag,
  title: 'components/SeverityTag',
  args: { severity: 'critical' },
  argTypes: { severity: { control: 'select', options: SEVERITIES } },
};
export default meta;

type Story = StoryObj<typeof SeverityTag>;

export const Critical: Story = {};

export const AllSeverities: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {SEVERITIES.map((severity) => (
        <SeverityTag key={severity} severity={severity} />
      ))}
    </div>
  ),
};
