import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TONES } from '@/lib/tone';
import { BracketTag } from './bracket-tag';

const meta: Meta<typeof BracketTag> = {
  component: BracketTag,
  title: 'components/BracketTag',
  args: { label: 'scf_funded' },
};
export default meta;

type Story = StoryObj<typeof BracketTag>;

export const Default: Story = {};

export const Emphasis: Story = { args: { tone: 'destructive', emphasis: true, label: 'blocked' } };

export const AllTones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {TONES.map((tone) => (
        <BracketTag key={tone} tone={tone} label={tone} />
      ))}
    </div>
  ),
};
