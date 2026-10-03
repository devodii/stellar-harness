import { Reproduce } from '@/components/reproduce';
import type { Headline } from '@/lib/report-view';
import { fileHref, Section, TextLink } from './section';

export function HeadlineSection({ headlines }: { headlines: Headline[] }) {
  return (
    <Section id="headline" title="Headline numbers">
      <div className="space-y-6">
        {headlines.map((headline) => (
          <div key={headline.id} className="space-y-2">
            <p className="font-medium">{headline.value}</p>
            <p className="text-sm text-muted-foreground">{headline.definition}</p>
            <p className="text-xs">
              <TextLink href={fileHref(headline.csv)}>{headline.csv}</TextLink>
              {', '}
              <TextLink href={`#${headline.method}`}>methodology</TextLink>
            </p>
            <Reproduce lines={headline.reproduce} />
          </div>
        ))}
      </div>
    </Section>
  );
}
