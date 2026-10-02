'use client';

import { type FileUIPart, isToolUIPart } from 'ai';
import { Attachment, AttachmentPreview, Attachments } from '@/components/ai-elements/attachments';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import { Source, Sources, SourcesContent, SourcesTrigger } from '@/components/ai-elements/sources';
import { BracketTag } from '@/components/bracket-tag';
import { ContextChip } from '@/components/context-chip';
import { SwipeToReply } from '@/components/swipe-to-reply';
import { ToolCall } from '@/components/tool-call';
import type { HarnessPart, HarnessUIMessage } from '@/lib/chat';

const imageKey = (image: FileUIPart) => `${image.filename ?? 'image'}-${image.url.slice(-32)}`;

export interface ChatMessageProps {
  message: HarnessUIMessage;
  streaming?: boolean;
  onReply?: () => void;
}

function MessagePart({
  part,
  streaming,
  isLast,
}: {
  part: HarnessPart;
  streaming: boolean;
  isLast: boolean;
}) {
  if (part.type === 'text') {
    return <MessageResponse isAnimating={streaming && isLast}>{part.text}</MessageResponse>;
  }
  if (part.type === 'reasoning') {
    return (
      <Reasoning defaultOpen={false} isStreaming={streaming && isLast} className="mb-0">
        <ReasoningTrigger />
        <ReasoningContent>{part.text}</ReasoningContent>
      </Reasoning>
    );
  }
  if (part.type === 'data-context') {
    return <ContextChip context={part.data} className="bg-background" />;
  }
  if (part.type === 'data-plan-approval') {
    return (
      <BracketTag
        label={`${part.data.decision === 'approve' ? 'approved' : 'declined'} ${part.data.planId}`}
        tone={part.data.decision === 'approve' ? 'success' : 'destructive'}
      />
    );
  }
  if (isToolUIPart(part)) return <ToolCall part={part} />;
  return null;
}

export function ChatMessage({ message, streaming = false, onReply }: ChatMessageProps) {
  const sources = message.parts.filter((part) => part.type === 'source-url');
  const images = message.parts.filter(
    (part): part is FileUIPart => part.type === 'file' && part.mediaType.startsWith('image/'),
  );
  const parts = message.parts
    .map((part, index) => ({ part, key: `${message.id}-${index}` }))
    .filter(
      ({ part }) =>
        part.type !== 'source-url' && part.type !== 'step-start' && part.type !== 'file',
    );

  const body = (
    <Message
      from={message.role}
      className={message.role === 'assistant' ? 'max-w-full' : undefined}
    >
      <MessageContent
        className={message.role === 'user' ? 'gap-3 group-[.is-user]:bg-muted' : 'w-full gap-3'}
      >
        {images.length > 0 && (
          <Attachments variant="grid" className="ml-0">
            {images.map((image) => (
              <Attachment key={imageKey(image)} data={{ ...image, id: imageKey(image) }}>
                <AttachmentPreview />
              </Attachment>
            ))}
          </Attachments>
        )}
        {parts.map(({ part, key }, position) => (
          <MessagePart
            key={key}
            part={part}
            streaming={streaming}
            isLast={position === parts.length - 1}
          />
        ))}
      </MessageContent>
      {sources.length > 0 && (
        <Sources>
          <SourcesTrigger count={sources.length} />
          <SourcesContent>
            {sources.map((source) => (
              <Source key={source.sourceId} href={source.url} title={source.title ?? source.url} />
            ))}
          </SourcesContent>
        </Sources>
      )}
    </Message>
  );

  if (!onReply || message.role !== 'assistant') return body;
  return (
    <SwipeToReply onReply={onReply} disabled={streaming}>
      {body}
    </SwipeToReply>
  );
}
