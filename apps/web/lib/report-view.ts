import type { ReportFileInfo } from '@harness/storage/report';
import { formatDecimal } from './format';
import { type CsvRow, isActive, type Report } from './report-model';
import { fixFor } from './report-fixes';

const count = (value: number): string => formatDecimal(value, 0);
const xlm = (value: number): string => `${formatDecimal(value, 2)} XLM`;
const percent = (part: number, whole: number): string => {
  if (whole <= 0) return 'n/a';
  const value = (part / whole) * 100;
  return value > 0 && value < 0.1 ? '<0.1%' : `${formatDecimal(value, 1)}%`;
};

export type Headline = { id: string; value: string; definition: string; note?: string };
type CodeRow = { code: string; count: number; share: string; preventable: string; fix: string };
type AccountRow = {
  account: string;
  failures: number;
  code: string;
  classification: string;
  domain: string;
};
export type ContractRow = {
  contract: string;
  wasm: string;
  wasmContract: string;
  invocations: number;
  familySize: number;
  scfSlug: string;
  daysLeft: number;
  liveUntil: string;
};
type FunnelRow = { stage: string; reached: number; passed: number };
type AnchorRow = {
  domain: string;
  tomlUrl: string;
  country: string;
  region: string;
  stage: string;
  scfRound: string;
};
type SepRow = { check: string; tested: number; passed: number; rate: string };
type RentRow = { contract: string; xlm: number; usd: number };

export type ReportView = {
  snapshot: Report['summary']['snapshot'];
  headlines: Headline[];
  failures: { codes: CodeRow[]; accounts: AccountRow[] };
  contracts: { archived: ContractRow[]; expiring: ContractRow[]; note: string };
  anchors: { funnel: FunnelRow[]; failing: AnchorRow[]; perSep: SepRow[] };
  rent: { top: RentRow[]; note: string };
  files: ReportFileInfo[];
};

const CLASSIFICATIONS: [tag: string, label: string][] = [
  ['anchor_distribution', 'anchor'],
  ['channel_pattern', 'channel pattern'],
  ['contract_caller', 'contract caller'],
  ['multisig', 'multisig'],
];

const classify = (tags: string[]): string =>
  CLASSIFICATIONS.find(([tag]) => tags.includes(tag))?.[1] ?? 'single account';

const topAccounts = (clusters: CsvRow[], limit = 25): AccountRow[] => {
  const byAccount = new Map<string, CsvRow[]>();
  for (const row of clusters) {
    const account = row.account ?? '';
    byAccount.set(account, [...(byAccount.get(account) ?? []), row]);
  }
  return [...byAccount.entries()]
    .map(([account, rows]) => {
      const dominant = rows.reduce((top, row) =>
        Number(row.count) > Number(top.count) ? row : top,
      );
      return {
        account,
        failures: rows.reduce((sum, row) => sum + Number(row.count), 0),
        code: (dominant.type ?? '').replace(/_CLUSTER$/, '').toLowerCase(),
        classification: classify(rows.flatMap((row) => (row.tags ?? '').split(';'))),
        domain: dominant.home_domain ?? '',
      };
    })
    .sort((a, b) => b.failures - a.failures)
    .slice(0, limit);
};

const contractRows = (rows: CsvRow[]): ContractRow[] => {
  const firstByWasm = new Map<string, string>();
  for (const row of rows)
    if (row.wasm && !firstByWasm.has(row.wasm)) firstByWasm.set(row.wasm, row.contract ?? '');
  return rows.map((row) => ({
    contract: row.contract ?? '',
    wasm: row.wasm ?? '',
    wasmContract: firstByWasm.get(row.wasm ?? '') ?? row.contract ?? '',
    invocations: Number(row.invocations),
    familySize: Number(row.family_size),
    scfSlug: row.scf_slug ?? '',
    daysLeft: Number(row.days_left),
    liveUntil: row.live_until_ledger ?? '',
  }));
};

const STAGE_LABELS: Record<string, string> = {
  domainsTested: 'domains tested',
  tomlReachable: 'stellar.toml reachable',
  signingKey: 'signing key valid',
  endpoints: 'endpoints declared',
  infoReadable: '/info readable',
  sep10: 'SEP-10 challenge valid',
};

const SEP_LABELS: Record<string, string> = {
  sep1: 'SEP-1 (toml)',
  sep6_24: 'SEP-6 / SEP-24',
  sep10: 'SEP-10',
  sep31: 'SEP-31',
  sep38: 'SEP-38',
};

const sepLabel = (key: string): string => {
  const [tests, sep] = key.startsWith('tests:') ? [true, key.slice(6)] : [false, key];
  const label = SEP_LABELS[sep] ?? sep.toUpperCase().replace('SEP', 'SEP-');
  return tests ? `${label.replace(' (toml)', '')} anchor tests` : label;
};

const funnelValue = (funnel: CsvRow[], step: string): number =>
  Number(funnel.find((row) => row.step === step)?.domains ?? 0);

const headlines = ({ summary, csv }: Report): Headline[] => {
  const { failures, contracts, rent } = summary;
  const funnel = csv['anchors_funnel.csv'];
  const archived = contracts.archivedMeaningful || csv['contracts_archived_meaningful.csv'].length;
  const expiring =
    contracts.expiring30dMeaningful || csv['contracts_expiring_30d.csv'].filter(isActive).length;
  const usd = rent.xlmUsd ? ` (~$${count(rent.totalXlm12m * rent.xlmUsd.price)})` : '';
  return [
    {
      id: 'failures',
      value: `${count(failures.preventable.total)} preventable failures in 24 hours (${percent(failures.preventable.total, failures.txFailed)} of ${count(failures.txFailed)} failed, ${count(failures.txScanned)} total)`,
      definition: 'Failures a pre-flight check would have caught.',
      note: 'Most failures are path-payment price limits: op_over_source_max and op_under_dest_min. Neither counts as preventable.',
    },
    {
      id: 'contracts',
      value: `${count(archived)} archived, ${count(expiring)} expiring within 30 days`,
      definition: 'Active contracts: 100+ lifetime invocations or SCF-funded.',
    },
    {
      id: 'anchors',
      value: `${count(funnelValue(funnel, 'domainsTested'))} domains tested, ${count(funnelValue(funnel, 'tomlReachable'))} serve a stellar.toml, ${count(funnelValue(funnel, 'sep10'))} pass a SEP-10 challenge`,
      definition: 'Anchor domains listed in public Stellar directories.',
    },
    {
      id: 'rent',
      value: `${xlm(rent.totalXlm12m)}${usd} for 12 months`,
      definition: `12-month rent for ${count(rent.contractsEstimated)} sampled live contracts.`,
    },
  ];
};

export const buildReportView = (report: Report): ReportView => {
  const { summary, csv } = report;
  const funnel = csv['anchors_funnel.csv'].filter((row) => row.step && STAGE_LABELS[row.step]);
  const { rent, contracts } = summary;
  const rentDate = rent.xlmUsd?.at.slice(0, 10);
  return {
    snapshot: summary.snapshot,
    headlines: headlines(report),
    failures: {
      codes: csv['failed_tx_by_code.csv']
        .filter((row) => row.code !== 'tx_failed')
        .sort((a, b) => Number(b.count) - Number(a.count))
        .map((row) => ({
          code: row.code ?? '',
          count: Number(row.count),
          share: percent(Number(row.count), summary.failures.txFailed),
          preventable: row.preventable ?? '',
          fix: fixFor(row.code ?? ''),
        })),
      accounts: topAccounts(csv['failure_clusters.csv']),
    },
    contracts: {
      archived: contractRows(csv['contracts_archived_meaningful.csv']).sort(
        (a, b) => b.invocations - a.invocations,
      ),
      expiring: contractRows(csv['contracts_expiring_30d.csv'].filter(isActive)).sort(
        (a, b) => a.daysLeft - b.daysLeft,
      ),
      note: `Active means 100+ lifetime invocations or SCF-funded. Raw totals: ${count(contracts.archivedInstances)} archived, ${count(contracts.expiring30d)} expiring, of ${count(contracts.total)} contracts.`,
    },
    anchors: {
      funnel: funnel.map((row, index) => ({
        stage: STAGE_LABELS[row.step ?? ''] ?? '',
        reached: Number(index === 0 ? row.domains : funnel[index - 1]?.domains),
        passed: Number(row.domains),
      })),
      failing: csv['anchors_failing.csv'].map((row) => ({
        domain: row.domain ?? '',
        tomlUrl: row.toml_url || `https://${row.domain}/.well-known/stellar.toml`,
        country: row.country ?? '',
        region: row.region ?? '',
        stage: row.stage_failed ?? '',
        scfRound: row.scf_round ?? '',
      })),
      perSep: Object.entries(summary.anchors.perSep).map(([key, result]) => ({
        check: sepLabel(key),
        tested: result.tested,
        passed: result.passed,
        rate: percent(result.passed, result.tested),
      })),
    },
    rent: {
      top: csv['rent_top100.csv'].slice(0, 20).map((row) => ({
        contract: row.contract ?? '',
        xlm: Number(row.xlm12m),
        usd: Number(row.usd12m),
      })),
      note: `Total ${xlm(rent.totalXlm12m)}${rent.xlmUsd ? ` (~$${count(rent.totalXlm12m * rent.xlmUsd.price)} at ${formatDecimal(rent.xlmUsd.price, 4)} XLM/USD, ${rentDate})` : ''} across ${count(rent.contractsEstimated)} sampled live contracts; median ${xlm(rent.medianXlm12m)}.`,
    },
    files: report.files,
  };
};
