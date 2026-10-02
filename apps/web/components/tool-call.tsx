'use client';

import { WrenchIcon } from '@phosphor-icons/react';
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

const SELF_COLLAPSING_TOOLS: ReadonlySet<string> = new Set(['planFix']);

function ToolCallLabel({ part }: { part: ToolCallPart }) {
  return (
    <p className="flex items-center gap-2 py-1 font-mono text-xs text-muted-foreground">
      <WrenchIcon className="size-3.5" aria-hidden />
      <span className="truncate">{toolCallTitle(part)}</span>
    </p>
  );
}

export function ToolCall({ part }: { part: ToolCallPart }) {
  if (SELF_COLLAPSING_TOOLS.has(getToolName(part)) && part.state === 'output-available') {
    return (
      <div>
        <ToolCallLabel part={part} />
        <ToolCallBody part={part} />
      </div>
    );
  }

  const header =
    part.type === 'dynamic-tool' ? (
      <ToolHeader
        type={part.type}
        state={part.state}
        toolName={part.toolName}
        title={toolCallTitle(part)}
        className="gap-2 px-0 py-1 font-mono text-muted-foreground [&_[data-slot=badge]]:bg-transparent [&_[data-slot=badge]]:px-0 [&_span]:font-mono [&_span]:text-xs"
      />
    ) : (
      <ToolHeader
        type={part.type}
        state={part.state}
        title={toolCallTitle(part)}
        className="gap-2 px-0 py-1 font-mono text-muted-foreground [&_[data-slot=badge]]:bg-transparent [&_[data-slot=badge]]:px-0 [&_span]:font-mono [&_span]:text-xs"
      />
    );

  return (
    <Tool defaultOpen className="mb-0 rounded-none border-none bg-transparent">
      {header}
      <ToolContent className="space-y-0 border-none p-0 pt-1">
        <ToolCallBody part={part} />
      </ToolContent>
    </Tool>
  );
}
