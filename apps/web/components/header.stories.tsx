import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { DEMO_ORG } from '@/demo-org';
import { ConversationsProvider } from './conversations-provider';
import { Header, policyLine } from './header';
import { SidebarProvider } from './ui/sidebar';

const meta: Meta<typeof Header> = {
  component: Header,
  title: 'components/Header',
  args: { org: DEMO_ORG },
  decorators: [
    (Story) => (
      <ConversationsProvider>
        <SidebarProvider className="min-h-0 flex-col">
          <Story />
        </SidebarProvider>
      </ConversationsProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Header>;

export const Default: Story = {};

export const ShowsPolicy: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole('button', { name: 'Policy' }));
    await expect(await within(document.body).findByRole('tooltip')).toHaveTextContent(
      policyLine(DEMO_ORG),
    );
  },
};
