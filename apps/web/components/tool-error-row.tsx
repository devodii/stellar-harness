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
        'flex min-w-0 items-baseline gap-2 border-l-2 border-destructive py-0.5 pl-3 font-mono text-xs',
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
