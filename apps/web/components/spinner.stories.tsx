import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CheckMark } from './icons';
import { Spinner } from './ui/spinner';

const meta: Meta<typeof Spinner> = {
  component: Spinner,
  title: 'components/Spinner',
};
export default meta;

type Story = StoryObj<typeof Spinner>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4 text-foreground">
      <Spinner size={12} />
      <Spinner />
      <Spinner size={24} />
      <Spinner size={32} className="text-primary" />
    </div>
  ),
};

export const Check: StoryObj<typeof CheckMark> = {
  render: () => <CheckMark className="size-5 text-foreground" />,
};
