import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemeProvider } from './theme-provider';
import { ThemeToggle } from './theme-toggle';

const meta: Meta<typeof ThemeToggle> = {
  component: ThemeToggle,
  title: 'components/ThemeToggle',
  render: (args) => (
    <ThemeProvider attribute="class" defaultTheme="light">
      <ThemeToggle {...args} />
    </ThemeProvider>
  ),
};
export default meta;

type Story = StoryObj<typeof ThemeToggle>;

export const Default: Story = {};
