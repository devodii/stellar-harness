import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ChatList } from './chat-list';
import { Sidebar, SidebarContent, SidebarProvider } from './ui/sidebar';

const ITEMS = [
  { id: 'a', title: 'Why did transaction ffff…0001 fail?', updatedAt: '2026-01-03T00:00:00Z' },
  { id: 'b', title: 'Is anchor.example conformant?', updatedAt: '2026-01-02T00:00:00Z' },
  { id: 'c', title: 'Pre-flight a 25 USDX payment', updatedAt: '2026-01-01T00:00:00Z' },
];

const meta: Meta<typeof ChatList> = {
  component: ChatList,
  title: 'shell/ChatList',
  args: { items: ITEMS, activeId: 'b', hrefFor: (id: string) => `/?c=${id}`, onDelete: fn() },
  decorators: [
    (Story) => (
      <SidebarProvider>
        <Sidebar collapsible="none" className="h-96 rounded-md border border-border">
          <SidebarContent>
            <Story />
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ChatList>;

export const Default: Story = {};

export const Empty: Story = { args: { items: [] } };

export const Loading: Story = { args: { loading: true } };
