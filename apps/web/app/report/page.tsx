import type { Metadata } from 'next';
import { ExplorerLink } from '@/components/explorer-link';
import { AnchorsSection } from '@/components/report/anchors';
import { ContractsSection } from '@/components/report/contracts';
import { DownloadsSection } from '@/components/report/downloads';
import { FailuresSection } from '@/components/report/failures';
import { HeadlineSection } from '@/components/report/headline';
import { RentSection } from '@/components/report/rent';
import { fileHref, TextLink } from '@/components/report/section';
import { Wordmark } from '@/components/wordmark';
import { loadReport } from '@/lib/report';
import { REPORT_CSVS } from '@/lib/report-model';
import { buildReportView } from '@/lib/report-view';

export const revalidate = 3600;

const TITLE = 'Stellar Harness mainnet operations report';
const PAGE_URL = 'https://stellarharness.xyz/report';
const SOURCE_URL = 'https://github.com/devodii/stellar-harness/tree/main/packages/scanner#method';
const CONTACT = 'emmanuelodii80@gmail.com';

const SECTIONS = [
  ['headline', 'Headline'],
  ['failures', 'Failed transactions'],
  ['contracts', 'Contracts'],
  ['anchors', 'Anchors'],
  ['rent', 'Rent'],
  ['downloads', 'Downloads'],
] as const;

const loadView = async () => {
  const report = await loadReport();
  return report ? buildReportView(report) : null;
};

export async function generateMetadata(): Promise<Metadata> {
  const view = await loadView();
  const description = view
    ? view.headlines
        .slice(0, 3)
        .map((headline) => headline.value)
        .join('. ')
    : 'Measured operational failures on Stellar mainnet.';
  return {
    title: TITLE,
    description,
    openGraph: { title: TITLE, description, url: PAGE_URL, type: 'article' },
    alternates: {
      types: { 'text/csv': REPORT_CSVS.map((name) => ({ url: fileHref(name), title: name })) },
    },
  };
}

export default async function ReportPage() {
  const view = await loadView();
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 text-sm">
      <header className="space-y-3">
        <Wordmark className="font-mono text-sm" />
        <h1 className="text-lg font-medium">Mainnet operations report</h1>
        {view && (
          <p className="font-mono text-xs text-muted-foreground">
            ledger <ExplorerLink kind="ledger" id={view.snapshot.snapshotLedger} />,{' '}
            {view.snapshot.snapshotTime.slice(0, 16).replace('T', ' ')} UTC,{' '}
            <TextLink href={SOURCE_URL}>source</TextLink>
          </p>
        )}
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="text-muted-foreground hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>
      </header>
      {view ? (
        <>
          <HeadlineSection headlines={view.headlines} />
          <FailuresSection failures={view.failures} />
          <ContractsSection contracts={view.contracts} />
          <AnchorsSection anchors={view.anchors} />
          <RentSection rent={view.rent} />
          <DownloadsSection files={view.files} />
        </>
      ) : (
        <p className="text-muted-foreground">The report has not been published yet.</p>
      )}
      <footer className="border-t pt-6 text-xs text-muted-foreground">
        <a href={`mailto:${CONTACT}`} className="hover:text-foreground">
          {CONTACT}
        </a>
      </footer>
    </main>
  );
}
