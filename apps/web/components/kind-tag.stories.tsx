import { PlanStepKind } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { KindTag } from './kind-tag';

const meta: Meta<typeof KindTag> = {
  component: KindTag,
  title: 'components/KindTag',
  args: { kind: 'simulate' },
  argTypes: { kind: { control: 'select', options: PlanStepKind.options } },
};
export default meta;

type Story = StoryObj<typeof KindTag>;

export const Simulate: Story = {};

export const AllKinds: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {PlanStepKind.options.map((kind) => (
        <KindTag key={kind} kind={kind} />
      ))}
    </div>
  ),
};
