import { cn } from 'cn';
import { MonoNumber } from '@/components/mono-number';
import { StatLabel } from '@/components/stat';
import { Skeleton } from '@/components/ui/skeleton';
import { TONE_TEXT, type Tone } from '@/lib/tone';

export interface LiveStripItem {
  id: string;
  label: string;
  value: number | null | undefined;
  format?: (value: number) => string;
  tone?: Tone;
  title?: string;
}

export interface LiveStripProps {
  items: LiveStripItem[];
  live?: boolean;
  loading?: boolean;
  className?: string;
}

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
                  TONE_TEXT[item.tone ?? 'default'],
                )}
              />
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
