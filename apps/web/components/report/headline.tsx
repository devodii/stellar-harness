import type { Headline } from '@/lib/report-view';
import { Section } from './section';

export function HeadlineSection({ headlines }: { headlines: Headline[] }) {
  return (
    <Section id="headline" title="Headline">
      <dl className="divide-y border-y">
        {headlines.map((headline) => (
          <div key={headline.id} className="space-y-1 py-3">
            <dt className="font-medium">{headline.value}</dt>
            <dd className="text-sm text-muted-foreground">{headline.definition}</dd>
            {headline.note && <dd className="text-sm text-muted-foreground">{headline.note}</dd>}
          </div>
        ))}
      </dl>
    </Section>
  );
}
