import type { ReportFileInfo } from '@harness/storage/report';
import { formatDecimal } from './format';
import { fixFor } from './report-fixes';
import { CENSUSES, type CsvRow, isActive, type Report, type RunRecord } from './report-model';

const count = (value: number): string => formatDecimal(value, 0);
const xlm = (value: number): string => `${formatDecimal(value, 2)} XLM`;
const percent = (part: number, whole: number): string => {
  if (whole <= 0) return 'n/a';
  const value = (part / whole) * 100;
  return value > 0 && value < 0.1 ? '<0.1%' : `${formatDecimal(value, 1)}%`;
};

export type Headline = {
  id: string;
  value: string;
  definition: string;
  csv: string;
  method: string;
  reproduce: string[];
};
type CodeRow = {
  code: string;
  count: number;
  share: string;
  preventable: string;
  fix: string;
};
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
type FunnelRow = { step: string; passed: number; failed: number };
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
type IssueRow = { url: string; title: string; repo: string; state: string; opened: string };
type MethodRow = { census: Census; record: RunRecord };
type Census = (typeof CENSUSES)[number];

export type ReportView = {
  snapshot: Report['summary']['snapshot'];
  headlines: Headline[];
  failures: {
    codes: CodeRow[];
    accounts: AccountRow[];
    windowStart: string;
    windowEnd: string;
    startLedger: string;
    endLedger: string;
  };
  contracts: {
    archived: ContractRow[];
    expiring: ContractRow[];
    archivedTotal: number;
    expiringTotal: number;
    total: number;
  };
  anchors: { funnel: FunnelRow[]; failing: AnchorRow[]; perSep: SepRow[] };
  rent: { top: RentRow[]; note: string };
  issues: { category: string; rows: IssueRow[] }[];
  methods: MethodRow[];
  files: ReportFileInfo[];
};

const classify = (tags: string[]): string => {
  if (tags.includes('anchor_distribution')) return 'anchor distribution';
  if (tags.includes('channel_pattern')) return 'channel pattern';
  if (tags.includes('multisig')) return 'multisig';
  return 'single account';
};

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

const STEP_LABELS: Record<string, string> = {
  domainsTested: 'domains tested',
  tomlReachable: 'stellar.toml reachable',
  signingKey: 'signing key valid',
  endpoints: 'endpoints declared',
  infoReadable: '/info readable',
  sep10: 'SEP-10 challenge valid',
  testsPassed: 'read-only anchor tests pass',
};

const headlines = ({ summary, runs, csv }: Report): Headline[] => {
  const { failures, contracts, anchors, rent } = summary;
  const archivedActive =
    contracts.archivedMeaningful || csv['contracts_archived_meaningful.csv'].length;
  const expiringActive =
    contracts.expiring30dMeaningful || csv['contracts_expiring_30d.csv'].filter(isActive).length;
  const params = runs.failures?.method.parameters ?? {};
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
        runs.failures?.method.endpoints[0] ?? 'POST https://mainnet.sorobanrpc.com getTransactions',
        `for ledgers ${params['start ledger'] ?? '?'} to ${params['end ledger'] ?? '?'}; result codes decoded from result_xdr`,
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

export const buildReportView = (report: Report): ReportView => {
  const { summary, csv, runs } = report;
  const params = runs.failures?.method.parameters ?? {};
  const issues = new Map<string, IssueRow[]>();
  for (const row of csv['github_issues.csv']) {
    const category = row.category ?? '';
    issues.set(category, [
      ...(issues.get(category) ?? []),
      {
        url: row.url ?? '',
        title: row.title ?? '',
        repo: row.repo ?? '',
        state: row.state ?? '',
        opened: (row.createdAt ?? '').slice(0, 10),
      },
    ]);
  }
  const funnelRows = csv['anchors_funnel.csv'];
  const { rent } = summary;
  return {
    snapshot: summary.snapshot,
    headlines: headlines(report),
    failures: {
      codes: [...csv['failed_tx_by_code.csv']]
        .sort((a, b) => Number(b.count) - Number(a.count))
        .map((row) => ({
          code: row.code ?? '',
          count: Number(row.count),
          share: percent(Number(row.count), summary.failures.txFailed),
          preventable: row.preventable ?? '',
          fix: fixFor(row.code ?? ''),
        })),
      accounts: topAccounts(csv['failure_clusters.csv']),
      windowStart: summary.failures.windowStart,
      windowEnd: summary.failures.windowEnd,
      startLedger: String(params['start ledger'] ?? ''),
      endLedger: String(params['end ledger'] ?? ''),
    },
    contracts: {
      archived: contractRows(csv['contracts_archived_meaningful.csv']).sort(
        (a, b) => b.invocations - a.invocations,
      ),
      expiring: contractRows(csv['contracts_expiring_30d.csv'].filter(isActive)).sort(
        (a, b) => a.daysLeft - b.daysLeft,
      ),
      archivedTotal: summary.contracts.archivedInstances,
      expiringTotal: summary.contracts.expiring30d,
      total: summary.contracts.total,
    },
    anchors: {
      funnel: funnelRows.map((row, index) => {
        const passed = Number(row.domains);
        const previous = index === 0 ? passed : Number(funnelRows[index - 1]?.domains);
        return {
          step: STEP_LABELS[row.step ?? ''] ?? row.step ?? '',
          passed,
          failed: previous - passed,
        };
      }),
      failing: csv['anchors_failing.csv'].map((row) => ({
        domain: row.domain ?? '',
        tomlUrl: row.toml_url || `https://${row.domain}/.well-known/stellar.toml`,
        country: row.country ?? '',
        region: row.region ?? '',
        stage: row.stage_failed ?? '',
        scfRound: row.scf_round ?? '',
      })),
      perSep: Object.entries(summary.anchors.perSep).map(([sep, result]) => ({
        check: sep.replace('tests:', 'anchor tests ').replace('sep6_24', 'sep6 and sep24'),
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
      note: `Total ${xlm(rent.totalXlm12m)} and median ${xlm(rent.medianXlm12m)} across ${count(rent.contractsEstimated)} sampled live contracts.${rent.xlmUsd ? ` USD at ${rent.xlmUsd.price} XLM/USD from ${rent.xlmUsd.source} at ${rent.xlmUsd.at}.` : ''}`,
    },
    issues: [...issues.entries()]
      .map(([category, rows]) => ({
        category,
        rows: rows.sort((a, b) => b.opened.localeCompare(a.opened)),
      }))
      .sort((a, b) => b.rows.length - a.rows.length),
    methods: CENSUSES.flatMap((census) => {
      const record = runs[census];
      return record ? [{ census, record }] : [];
    }),
    files: report.files,
  };
};
