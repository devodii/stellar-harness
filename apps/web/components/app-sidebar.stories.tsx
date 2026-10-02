import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { AppSidebarView } from './app-sidebar';
import { SidebarInset, SidebarProvider } from './ui/sidebar';

const CONVERSATIONS = [
  { id: 'a', title: 'Why did transaction ffff…0001 fail?', updatedAt: '2026-01-03T00:00:00Z' },
  { id: 'b', title: 'Is anchor.example conformant?', updatedAt: '2026-01-02T00:00:00Z' },
];

const meta: Meta<typeof AppSidebarView> = {
  component: AppSidebarView,
  title: 'shell/AppSidebar',
  args: {
    pathname: '/',
    conversations: CONVERSATIONS,
    activeId: 'a',
    onNewChat: fn(),
    onDelete: fn(),
  },
  decorators: [
    (Story) => (
      <SidebarProvider className="min-h-[480px]">
        <Story />
        <SidebarInset className="p-4 text-sm text-muted-foreground">page content</SidebarInset>
      </SidebarProvider>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof AppSidebarView>;

export const Chat: Story = {};

export const FindingsActive: Story = { args: { pathname: '/findings', activeId: null } };

export const Loading: Story = { args: { loading: true } };

export const NoChats: Story = { args: { conversations: [] } };
