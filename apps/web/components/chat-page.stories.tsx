import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ChatPage } from './chat-page';
import { ConversationsProvider } from './conversations-provider';
import { QueryStory } from './query-story';

const meta: Meta<typeof ChatPage> = {
  component: ChatPage,
  title: 'chat/ChatPage',
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <QueryStory>
        <ConversationsProvider>
          <div className="flex h-[640px] flex-col">
            <Story />
          </div>
        </ConversationsProvider>
      </QueryStory>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ChatPage>;

export const NewConversation: Story = {};
