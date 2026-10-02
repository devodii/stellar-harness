import { DEFAULT_NETWORK, type Network } from '@harness/schema';
import { cn } from 'cn';
import { ChatSuggestions } from '@/components/chat-suggestions';
import { StatLabel } from '@/components/stat';
import type { ChatSuggestion } from '@/lib/suggestions';

export interface ChatEmptyProps {
  suggestions: ChatSuggestion[];
  onSelect: (prompt: string) => void;
  network?: Network;
  scanned?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ChatEmpty({
  suggestions,
  onSelect,
  network = DEFAULT_NETWORK,
  scanned,
  disabled,
  className,
}: ChatEmptyProps) {
  return (
    <div className={cn('mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10', className)}>
      <div className="space-y-2">
        <h1 className="font-display text-4xl leading-tight text-foreground">
          What is going wrong on {network}?
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          An operator agent that reads Stellar {network}, explains failures, simulates fixes and
          says who would have to act. Every network fact comes from a tool call. Nothing is signed
          or broadcast.
        </p>
      </div>
      <div className="space-y-2">
        <StatLabel>
          {scanned ? 'workflows from the latest scan' : `workflows on live ${network}`}
        </StatLabel>
        <ChatSuggestions suggestions={suggestions} onSelect={onSelect} disabled={disabled} />
      </div>
    </div>
  );
}
