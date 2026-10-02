import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ChatActionsProvider } from './chat-actions';
import { ToolCall, type ToolCallPart } from './tool-call';

const CONTRACT = 'CFAKECONTRACTFORSTORYBOOK0000000000000000000000000000ABC';
const meta_ = { tool: 'getContractTtl', ms: 42 };

const TTL = {
  contractId: CONTRACT,
  wasmHash: null,
  instance: {
    present: true,
    liveUntilLedgerSeq: 1200000,
    ledgersLeft: 200000,
    daysLeft: 13.9,
    archived: false,
  },
  code: {
    present: true,
    liveUntilLedgerSeq: 3000000,
    ledgersLeft: 2000000,
    daysLeft: 138.9,
    archived: false,
  },
  invocations: 12,
  snapshotLedger: 1000000,
  ledgerCloseSeconds: 6,
};

const done: ToolCallPart = {
  type: 'tool-getContractTtl',
  toolCallId: 'call-1',
  state: 'output-available',
  input: { contractId: CONTRACT },
  output: { ok: true, data: TTL, meta: meta_ },
};

const meta: Meta<typeof ToolCall> = {
  component: ToolCall,
  title: 'chat/ToolCall',
  args: { part: done },
  decorators: [
    (Story) => (
      <ChatActionsProvider value={{ decisions: {}, sendPrompt: fn(), onDecide: fn() }}>
        <Story />
      </ChatActionsProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ToolCall>;

export const Done: Story = {};

export const Running: Story = {
  args: {
    part: {
      type: 'tool-getContractTtl',
      toolCallId: 'call-2',
      state: 'input-available',
      input: { contractId: CONTRACT },
    },
  },
};

export const EnvelopeError: Story = {
  args: {
    part: {
      ...done,
      output: {
        ok: false,
        error: { code: 'UPSTREAM_TIMEOUT', message: 'RPC did not answer in 15s.' },
        meta: meta_,
      },
    },
  },
};

export const ExecutionError: Story = {
  args: {
    part: {
      type: 'tool-getContractTtl',
      toolCallId: 'call-3',
      state: 'output-error',
      input: { contractId: CONTRACT },
      errorText: 'Tool execution threw.',
    },
  },
};

export const UnknownToolFallsBackToJson: Story = {
  args: {
    part: {
      type: 'dynamic-tool',
      toolName: 'experimentalThing',
      toolCallId: 'call-4',
      state: 'output-available',
      input: { query: 'anything' },
      output: { answer: 42, note: 'no renderer registered' },
    },
  },
};
