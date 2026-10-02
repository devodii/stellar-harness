import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { HarnessUIMessage } from '@/lib/chat';
import { ChatView } from './chat-view';
import { fakeContract } from './story-ids';

const CONTRACT = fakeContract('story');

const SUGGESTIONS = [
  { id: 'a', label: 'Why did tx abcd…ef01 fail?', prompt: 'Why did transaction abcdef01 fail?' },
  { id: 'b', label: '12 month rent', prompt: 'What does rent cost?' },
];

const HISTORY: HarnessUIMessage[] = [
  {
    id: 'u1',
    role: 'user',
    parts: [{ type: 'text', text: `What does it cost to keep ${CONTRACT} alive for 12 months?` }],
  },
  {
    id: 'a1',
    role: 'assistant',
    parts: [
      {
        type: 'tool-simulateExtendTtl',
        toolCallId: 'c1',
        state: 'output-available',
        input: { contractId: CONTRACT, days: 365 },
        output: {
          ok: true,
          meta: { tool: 'simulateExtendTtl', ms: 230 },
          data: {
            contractId: CONTRACT,
            minResourceFeeStroops: 18_350_421,
            estimatedXlm: 1.8350421,
            unsignedXdr: 'AAAAAgAAAABGQUtFWERSRk9SU1RPUllCT09LT05MWQ==',
            footprint: { readOnly: ['instance', 'code'], readWrite: [] },
            days: 365,
            extendToLedgers: 5_256_000,
          },
        },
      },
      { type: 'text', text: 'Keeping it alive for 12 months costs about **1.84 XLM** in rent.' },
    ],
  },
];

const meta: Meta<typeof ChatView> = {
  component: ChatView,
  title: 'chat/ChatView',
  args: {
    conversationId: 'story-chat',
    initialMessages: HISTORY,
    suggestions: SUGGESTIONS,
    onMessagesChange: fn(),
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="flex h-[640px] flex-col">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ChatView>;

export const WithHistory: Story = {};

export const Empty: Story = { args: { conversationId: 'story-empty', initialMessages: [] } };
