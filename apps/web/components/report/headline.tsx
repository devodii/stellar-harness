import { Reproduce } from '@/components/reproduce';
import { isActive, type Report } from '@/lib/report-model';
import { count, fileHref, percent, Section, TextLink, xlm } from './section';

type Headline = {
  id: string;
  value: string;
  definition: string;
  csv: string;
  method: string;
  reproduce: string[];
};

export const headlines = ({ summary, runs, csv }: Report): Headline[] => {
  const { failures, contracts, anchors, rent } = summary;
  const archivedActive =
    contracts.archivedMeaningful || csv['contracts_archived_meaningful.csv'].length;
  const expiringActive =
    contracts.expiring30dMeaningful || csv['contracts_expiring_30d.csv'].filter(isActive).length;
  const failuresParams = runs.failures?.method.parameters ?? {};
  const usd = rent.xlmUsd ? rent.totalXlm12m * rent.xlmUsd.price : null;
  return [
    {
      id: 'failures',
      value: `${count(failures.txFailed)} failed transactions (${percent(failures.txFailed, failures.txScanned)} of ${count(failures.txScanned)}), ${count(failures.preventable.total)} preventable (${percent(failures.preventable.total, failures.txFailed)})`,
      definition:
        'Transactions that failed in the 24 hours before the snapshot; preventable means a pre-flight check would have caught the result code.',
      csv: 'failed_tx_by_code.csv',
      method: 'method-failures',
      reproduce: [
        `${runs.failures?.method.endpoints[0] ?? 'POST https://mainnet.sorobanrpc.com getTransactions'}`,
        `for ledgers ${failuresParams['start ledger'] ?? '?'} to ${failuresParams['end ledger'] ?? '?'}; result codes decoded from result_xdr`,
      ],
    },
    {
      id: 'contracts',
      value: `${count(archivedActive)} active contracts archived, ${count(expiringActive)} expiring within 30 days`,
      definition: `Active means 100 or more lifetime invocations, or SCF-funded. Raw totals including mass-deployed families: ${count(contracts.archivedInstances)} archived, ${count(contracts.expiring30d)} expiring.`,
      csv: 'contracts_archived_meaningful.csv',
      method: 'method-contracts',
      reproduce: [
        runs.contracts?.method.endpoints[0] ??
          'GET https://api.stellar.expert/explorer/public/contract',
        runs.contracts?.method.endpoints[2] ??
          'POST https://mainnet.sorobanrpc.com getLedgerEntries',
        'archived when the instance is absent or its liveUntilLedgerSeq is below the snapshot ledger',
      ],
    },
    {
      id: 'anchors',
      value: `${count(anchors.failing.length)} of ${count(anchors.domainsTested)} anchor domains fail conformance`,
      definition:
        'Domains that fail at least one probe stage, counting the read-only anchor tests. The funnel below shows where each one stops.',
      csv: 'anchors_failing.csv',
      method: 'method-anchors',
      reproduce: [
        'GET https://{domain}/.well-known/stellar.toml',
        'GET {TRANSFER_SERVER}/info, GET {WEB_AUTH_ENDPOINT}?account=<random public key>',
      ],
    },
    {
      id: 'rent',
      value: `${xlm(rent.totalXlm12m)}${usd === null ? '' : ` (about $${count(usd)})`} to keep ${count(rent.contractsEstimated)} sampled live contracts alive for 12 months`,
      definition: `Median ${xlm(rent.medianXlm12m)} per contract.${rent.xlmUsd ? ` XLM/USD ${rent.xlmUsd.price} from ${rent.xlmUsd.source} at ${rent.xlmUsd.at}.` : ''} A seeded stratified sample, not the full live population.`,
      csv: 'rent_top100.csv',
      method: 'method-rent',
      reproduce: [
        runs.rent?.method.endpoints[0] ?? 'POST https://mainnet.sorobanrpc.com simulateTransaction',
      ],
    },
  ];
};

export function HeadlineSection({ report }: { report: Report }) {
  return (
    <Section id="headline" title="Headline numbers">
      <div className="space-y-6">
        {headlines(report).map((headline) => (
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
