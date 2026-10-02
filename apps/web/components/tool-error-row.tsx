import { cn } from 'cn';
import { BracketTag } from '@/components/bracket-tag';
import { TONE_TEXT } from '@/lib/tone';

export interface ToolErrorRowProps {
  message: string;
  code?: string;
  className?: string;
}

export function ToolErrorRow({ message, code, className }: ToolErrorRowProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex min-w-0 items-baseline gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-1.5 font-mono text-xs',
        className,
      )}
    >
      <BracketTag label="error" tone="destructive" emphasis />
      {code && <span className={cn('shrink-0', TONE_TEXT.destructive)}>{code}</span>}
      <span className="min-w-0 truncate text-foreground" title={message}>
        {message}
      </span>
    </div>
  );
}
