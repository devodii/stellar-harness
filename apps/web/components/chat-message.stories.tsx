import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { HarnessUIMessage } from '@/lib/chat';
import { ChatActionsProvider } from './chat-actions';
import { ChatMessage } from './chat-message';
import { fakeAccount } from './story-ids';

const FAKE_ACCOUNT = fakeAccount('story');

const USER: HarnessUIMessage = {
  id: 'u1',
  role: 'user',
  parts: [{ type: 'text', text: `Check account ${FAKE_ACCOUNT}` }],
};

const ASSISTANT: HarnessUIMessage = {
  id: 'a1',
  role: 'assistant',
  parts: [
    { type: 'step-start' },
    { type: 'reasoning', text: 'The user wants account details, so call getAccount first.' },
    {
      type: 'tool-getAccount',
      toolCallId: 'c1',
      state: 'output-available',
      input: { address: FAKE_ACCOUNT },
      output: {
        ok: true,
        meta: { tool: 'getAccount', ms: 80 },
        data: {
          address: FAKE_ACCOUNT,
          exists: true,
          sequence: '42',
          balances: [{ asset: 'XLM', balance: '12.5000000' }],
          thresholds: { low: 0, med: 0, high: 0 },
          signers: [{ key: FAKE_ACCOUNT, weight: 1 }],
          flags: {
            authRequired: false,
            authRevocable: false,
            authImmutable: false,
            authClawbackEnabled: false,
          },
          homeDomain: null,
          subentryCount: 0,
          numSponsoring: 0,
          numSponsored: 0,
        },
      },
    },
    {
      type: 'text',
      text: 'The account **exists** with a single signer and `12.5 XLM`. No trustlines are set.',
    },
    { type: 'source-url', sourceId: 's1', url: 'https://example.org/docs', title: 'Docs' },
  ],
};

const meta: Meta<typeof ChatMessage> = {
  component: ChatMessage,
  title: 'chat/ChatMessage',
  args: { message: ASSISTANT },
  decorators: [
    (Story) => (
      <ChatActionsProvider value={{ sendPrompt: fn() }}>
        <div className="max-w-3xl">
          <Story />
        </div>
      </ChatActionsProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ChatMessage>;

export const Assistant: Story = {};

export const User: Story = { args: { message: USER } };

export const Streaming: Story = {
  args: {
    streaming: true,
    message: {
      id: 'a2',
      role: 'assistant',
      parts: [{ type: 'reasoning', text: 'Thinking about which tool to call' }],
    },
  },
};
