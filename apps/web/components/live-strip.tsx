import { cn } from 'cn';
import { MonoNumber } from '@/components/mono-number';
import { StatLabel, type StatTone } from '@/components/stat';
import { Skeleton } from '@/components/ui/skeleton';

export interface LiveStripItem {
  id: string;
  label: string;
  value: number | null | undefined;
  format?: (value: number) => string;
  tone?: StatTone;
  title?: string;
}

export interface LiveStripProps {
  items: LiveStripItem[];
  live?: boolean;
  loading?: boolean;
  className?: string;
}

const TONE_CLASS: Record<StatTone, string> = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

export function LiveStrip({ items, live = false, loading = false, className }: LiveStripProps) {
  return (
    <dl
      aria-live="polite"
      className={cn('flex min-w-0 items-center gap-x-5 overflow-x-auto text-sm', className)}
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          live ? 'animate-pulse bg-success' : 'bg-muted-foreground/40',
        )}
      />
      {items.map((item) => (
        <div key={item.id} title={item.title} className="flex shrink-0 items-baseline gap-1.5">
          <dt>
            <StatLabel>{item.label}</StatLabel>
          </dt>
          <dd>
            {loading ? (
              <Skeleton className="h-4 w-12" />
            ) : (
              <MonoNumber
                key={String(item.value)}
                value={item.value}
                format={item.format}
                className={cn(
                  'inline-block text-xs animate-in fade-in slide-in-from-bottom-1 duration-500',
                  TONE_CLASS[item.tone ?? 'default'],
                )}
              />
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
