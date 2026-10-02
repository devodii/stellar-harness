'use client';

import { cn } from 'cn';
import { BracketTag } from '@/components/bracket-tag';
import { PlanView, type PlanViewProps } from '@/components/plan-view';
import { ResultCard } from '@/components/result-card';
import { StatLabel } from '@/components/stat';
import { TONE_TEXT } from '@/lib/tone';
import type { PaymentPreflightView as PaymentPreflightData } from '@/lib/tool-views';

export interface PaymentPreflightViewProps extends Omit<PlanViewProps, 'plan' | 'className'> {
  preflight: PaymentPreflightData;
}

export function PaymentPreflightView({ preflight, ...planProps }: PaymentPreflightViewProps) {
  return (
    <div className="space-y-3">
      <ResultCard
        title="payment preflight"
        aside={
          preflight.ok ? (
            <BracketTag label="clear to send" tone="success" />
          ) : (
            <BracketTag
              label={`${preflight.blockers.length} blocker${preflight.blockers.length === 1 ? '' : 's'}`}
              tone="destructive"
              emphasis
            />
          )
        }
      >
        <ul className="space-y-0.5 font-mono text-xs">
          {preflight.checks.map((check) => (
            <li key={check.name} className="grid grid-cols-[3rem_11rem_1fr] items-baseline gap-2">
              <BracketTag
                label={check.ok ? 'ok' : 'fail'}
                tone={check.ok ? 'success' : 'destructive'}
              />
              <span className="text-foreground">{check.name}</span>
              <span className="truncate text-muted-foreground" title={check.detail}>
                {check.detail}
              </span>
            </li>
          ))}
        </ul>
        {preflight.blockers.length > 0 && (
          <div className="space-y-1.5">
            <StatLabel>blockers</StatLabel>
            <ul className="space-y-1.5">
              {preflight.blockers.map((blocker) => (
                <li
                  key={blocker.code}
                  className="rounded-md border border-destructive/40 bg-destructive/5 p-2"
                >
                  <code className={cn('font-mono text-xs', TONE_TEXT.destructive)}>
                    {blocker.code}
                  </code>
                  <p className="text-xs text-foreground">{blocker.fix}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </ResultCard>
      {preflight.alternative && <PlanView plan={preflight.alternative} {...planProps} />}
    </div>
  );
}
