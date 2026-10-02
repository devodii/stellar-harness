import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ChatSuggestions } from './chat-suggestions';

const SUGGESTIONS = [
  { id: 'a', label: 'Why did tx abcd…ef01 fail?', prompt: 'Why did transaction abcdef01 fail?' },
  { id: 'b', label: 'Archived contracts', prompt: 'Which contracts are archived?' },
  { id: 'c', label: 'Is anchor.example conformant?', prompt: 'Check anchor.example' },
  { id: 'd', label: 'Pre-flight a payment', prompt: 'Pre-flight a payment' },
  { id: 'e', label: 'Failure clusters, last 7d', prompt: 'Show failure clusters' },
  { id: 'f', label: '12 month rent', prompt: 'What does rent cost?' },
];

const meta: Meta<typeof ChatSuggestions> = {
  component: ChatSuggestions,
  title: 'chat/ChatSuggestions',
  args: { suggestions: SUGGESTIONS, onSelect: fn() },
};
export default meta;

type Story = StoryObj<typeof ChatSuggestions>;

export const Default: Story = {};

export const Disabled: Story = { args: { disabled: true } };
