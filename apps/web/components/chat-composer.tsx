'use client';

import { ImageIcon } from '@phosphor-icons/react';
import type { ChatStatus, FileUIPart } from 'ai';
import { cn } from 'cn';
import { toast } from 'sonner';
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from '@/components/ai-elements/attachments';
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input';
import { ContextChipList } from '@/components/context-chip';
import { NetworkSwitch } from '@/components/network-switch';
import type { ChatContext } from '@/lib/chat-context';
import { IMAGE_MAX_BYTES, IMAGE_MAX_FILES } from '@/lib/images';

export const CHAT_INPUT_ID = 'chat-input';

const CONTEXT_PLACEHOLDER: Record<ChatContext['kind'], string> = {
  finding: 'Ask about the attached finding…',
  reply: 'Reply…',
};

export const focusChatInput = () => document.getElementById(CHAT_INPUT_ID)?.focus();

export interface ChatComposerProps {
  onSubmit: (text: string, files: FileUIPart[]) => void;
  onStop?: () => void;
  status?: ChatStatus;
  disabled?: boolean;
  placeholder?: string;
  contexts?: ChatContext[];
  onRemoveContext?: (index: number) => void;
  className?: string;
}

function ComposerHeader({
  contexts,
  onRemoveContext,
}: {
  contexts: ChatContext[];
  onRemoveContext?: (index: number) => void;
}) {
  const attachments = usePromptInputAttachments();
  if (contexts.length === 0 && attachments.files.length === 0) return null;
  return (
    <PromptInputHeader className="flex-col items-stretch gap-2 px-3 pt-3">
      <ContextChipList contexts={contexts} onRemove={onRemoveContext} />
      {attachments.files.length > 0 && (
        <Attachments variant="grid" className="ml-0">
          {attachments.files.map((file) => (
            <Attachment
              key={file.id}
              data={file}
              onRemove={() => attachments.remove(file.id)}
              className="size-16"
            >
              <AttachmentPreview />
              <AttachmentRemove />
            </Attachment>
          ))}
        </Attachments>
      )}
    </PromptInputHeader>
  );
}

function AttachImageButton({ disabled }: { disabled?: boolean }) {
  const attachments = usePromptInputAttachments();
  return (
    <PromptInputButton
      type="button"
      aria-label="Attach images"
      disabled={disabled}
      onClick={() => attachments.openFileDialog()}
    >
      <ImageIcon className="size-4" />
    </PromptInputButton>
  );
}

export function ChatComposer({
  onSubmit,
  onStop,
  status = 'ready',
  disabled,
  placeholder = 'Ask about an account, transaction, contract or anchor…',
  contexts = [],
  onRemoveContext,
  className,
}: ChatComposerProps) {
  const attached = contexts.length > 0;
  return (
    <PromptInput
      className={cn('bg-card', className)}
      accept="image/*"
      multiple
      globalDrop
      maxFiles={IMAGE_MAX_FILES}
      maxFileSize={IMAGE_MAX_BYTES}
      onError={(error) => toast.error(error.message)}
      onSubmit={(message) => {
        const text = message.text.trim();
        if ((text || attached || message.files.length > 0) && !disabled) {
          onSubmit(text, message.files);
        }
      }}
    >
      <ComposerHeader contexts={contexts} onRemoveContext={onRemoveContext} />
      <PromptInputBody>
        <PromptInputTextarea
          id={CHAT_INPUT_ID}
          placeholder={contexts[0] ? CONTEXT_PLACEHOLDER[contexts[0].kind] : placeholder}
          disabled={disabled}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <AttachImageButton disabled={disabled} />
          <NetworkSwitch />
        </PromptInputTools>
        <PromptInputSubmit status={status} onStop={onStop} disabled={disabled} />
      </PromptInputFooter>
    </PromptInput>
  );
}
