import { cn } from 'cn';
import { BracketTag } from '@/components/bracket-tag';
import type { ResultCodesView } from '@/lib/tool-views';

const isSuccess = (code: string) => code.endsWith('_success');

export interface ResultCodesProps {
  codes: ResultCodesView;
  className?: string;
}

export function ResultCodes({ codes, className }: ResultCodesProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      <BracketTag
        label={codes.tx}
        tone={isSuccess(codes.tx) ? 'success' : 'destructive'}
        emphasis
      />
      {codes.ops.map((code, index) => (
        <span key={`${index}-${code}`} className="inline-flex items-baseline gap-1">
          <span className="font-mono text-[10px] text-muted-foreground">op{index + 1}</span>
          <BracketTag label={code} tone={isSuccess(code) ? 'muted' : 'destructive'} />
        </span>
      ))}
    </div>
  );
}
