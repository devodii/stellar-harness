import { cn } from 'cn';
import { formatInt } from '@/lib/format';

export interface MonoNumberProps {
  value: number | null | undefined;
  format?: (value: number) => string;
  fallback?: string;
  className?: string;
}

export function MonoNumber({
  value,
  format = formatInt,
  fallback = 'n/a',
  className,
}: MonoNumberProps) {
  const missing = value === null || value === undefined || Number.isNaN(value);
  return (
    <span
      translate="no"
      className={cn(
        'notranslate font-mono tabular-nums',
        missing && 'text-muted-foreground',
        className,
      )}
    >
      {missing ? fallback : format(value)}
    </span>
  );
}
