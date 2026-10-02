'use client';

import { type DynamicToolUIPart, getToolName, type ToolUIPart } from 'ai';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { Tool, ToolContent, ToolHeader } from '@/components/ai-elements/tool';
import { useChatActions } from '@/components/chat-actions';
import { ToolErrorRow } from '@/components/tool-error-row';
import { summarizeArgs } from '@/lib/format';
import { ToolOutput } from '@/lib/tool-renderers';

export type ToolCallPart = ToolUIPart | DynamicToolUIPart;

export const toolCallTitle = (part: ToolCallPart): string =>
  `${getToolName(part)}(${summarizeArgs(part.input)})`;

function ToolCallBody({ part }: { part: ToolCallPart }) {
  const actions = useChatActions();
  if (part.state === 'output-available') {
    return <ToolOutput toolName={getToolName(part)} output={part.output} ctx={actions} />;
  }
  if (part.state === 'output-error') return <ToolErrorRow message={part.errorText} />;
  if (part.state === 'output-denied') return <ToolErrorRow message="Tool call was denied." />;
  return (
    <Shimmer as="p" className="font-mono text-xs">
      {`calling ${getToolName(part)}…`}
    </Shimmer>
  );
}

export function ToolCall({ part }: { part: ToolCallPart }) {
  const header =
    part.type === 'dynamic-tool' ? (
      <ToolHeader
        type={part.type}
        state={part.state}
        toolName={part.toolName}
        title={toolCallTitle(part)}
        className="py-2 font-mono [&_span]:font-mono [&_span]:text-xs"
      />
    ) : (
      <ToolHeader
        type={part.type}
        state={part.state}
        title={toolCallTitle(part)}
        className="py-2 font-mono [&_span]:font-mono [&_span]:text-xs"
      />
    );

  return (
    <Tool defaultOpen className="mb-0 bg-card">
      {header}
      <ToolContent className="space-y-0 p-2 pt-0">
        <ToolCallBody part={part} />
      </ToolContent>
    </Tool>
  );
}
