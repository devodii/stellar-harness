import { AccentBlock } from '@/components/accent-block';
import { BracketTag } from '@/components/bracket-tag';
import { ResultCodes } from '@/components/result-codes';
import { ResultSection } from '@/components/result-section';
import type { FailureExplanationView as FailureExplanationData } from '@/lib/tool-views';

export function FailureExplanationView({ explanation }: { explanation: FailureExplanationData }) {
  return (
    <ResultSection
      title="failure explanation"
      aside={
        explanation.preventable ? (
          <BracketTag label="preventable" tone="warning" emphasis />
        ) : (
          <BracketTag label="not preventable" tone="muted" />
        )
      }
    >
      <ResultCodes codes={explanation.codes} />
      <p className="text-sm leading-relaxed text-foreground">{explanation.explanation}</p>
      {explanation.perCode.length > 0 && (
        <dl className="space-y-1.5">
          {explanation.perCode.map((entry) => (
            <div key={entry.code} className="grid gap-x-3 sm:grid-cols-[12rem_1fr]">
              <dt className="font-mono text-xs text-foreground">{entry.code}</dt>
              <dd className="text-xs text-muted-foreground">
                <span className="text-foreground">{entry.title}.</span> {entry.explanation}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <AccentBlock label="suggested action">
        <p className="text-sm text-foreground">{explanation.suggestedAction}</p>
      </AccentBlock>
    </ResultSection>
  );
}
