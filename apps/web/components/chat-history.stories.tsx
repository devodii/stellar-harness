import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { CONVERSATIONS_KEY, newConversation, withMessages } from '@/lib/conversations';
import { ChatHistory } from './chat-history';
import { ConversationsProvider } from './conversations-provider';

const seed = (titles: string[]) => {
  const conversations = titles.map((title, index) =>
    withMessages(
      newConversation(`c${index}`, new Date(Date.UTC(2026, 9, 2, 12, index))),
      [{ id: `u${index}`, role: 'user', parts: [{ type: 'text', text: title }] }],
      new Date(Date.UTC(2026, 9, 2, 12, index)),
    ),
  );
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
};

const meta: Meta<typeof ChatHistory> = {
  component: ChatHistory,
  title: 'components/ChatHistory',
  decorators: [
    (Story) => (
      <ConversationsProvider>
        <Story />
      </ConversationsProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ChatHistory>;

export const WithChats: Story = {
  beforeEach: () => {
    seed([
      'Check all our contracts and tell me which need attention',
      'Can we pay 25 USDC from treasury to distribution right now?',
    ]);
    return () => localStorage.removeItem(CONVERSATIONS_KEY);
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'history' }));
    const body = within(document.body);
    await expect(await body.findByRole('link', { name: /Can we pay 25 USDC/ })).toHaveAttribute(
      'href',
      '/?c=c1',
    );
    await userEvent.click(body.getByRole('button', { name: /Delete Check all our contracts/ }));
    await expect(body.queryByRole('link', { name: /Check all our contracts/ })).toBeNull();
  },
};

export const Empty: Story = {
  beforeEach: () => localStorage.removeItem(CONVERSATIONS_KEY),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'history' }));
    await expect(await within(document.body).findByText('No saved chats yet.')).toBeVisible();
  },
};
