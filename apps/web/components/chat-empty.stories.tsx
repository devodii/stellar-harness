import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ChatEmpty } from './chat-empty';

const SUGGESTIONS = [
  { id: 'a', label: 'Why did tx abcd…ef01 fail?', prompt: 'Why did transaction abcdef01 fail?' },
  { id: 'b', label: 'Archived contracts', prompt: 'Which contracts are archived?' },
  { id: 'c', label: 'Is anchor.example conformant?', prompt: 'Check anchor.example' },
  { id: 'd', label: 'Pre-flight a payment', prompt: 'Pre-flight a payment' },
  { id: 'e', label: 'Failure clusters, last 7d', prompt: 'Show failure clusters' },
  { id: 'f', label: '12 month rent', prompt: 'What does rent cost?' },
];

const meta: Meta<typeof ChatEmpty> = {
  component: ChatEmpty,
  title: 'chat/ChatEmpty',
  args: { suggestions: SUGGESTIONS, onSelect: fn() },
};
export default meta;

type Story = StoryObj<typeof ChatEmpty>;

export const LiveMainnet: Story = {};

export const FromScan: Story = { args: { scanned: true } };

export const LiveTestnet: Story = { args: { network: 'testnet' } };
