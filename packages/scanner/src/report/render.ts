import type { Summary } from '../schema';
import type { CensusRun, ExportPreview, MethodEntry, ReportInputs } from './inputs';
import {
  formatInt,
  formatPercent,
  formatXlm,
  heading,
  keyValueTable,
  sections,
  table,
} from './markdown';

export const PREVIEW_ROWS = 20;

const CENSUS_OF_EXPORT: Record<string, string> = {
  failed_tx_by_code: 'failures',
  failure_clusters: 'failures',
  anchors_failing: 'anchors',
  anchors_funnel: 'anchors',
  contracts_archived: 'contracts',
  contracts_archived_meaningful: 'contracts',
  contracts_expiring_30d: 'contracts',
  contracts_scf_funded: 'contracts',
  rent_top100: 'rent',
};

const countTable = (counts: Record<string, number>, label: string): string =>
  table(
    Object.entries(counts).sort(([keyA, a], [keyB, b]) => b - a || keyA.localeCompare(keyB)),
    [
      { header: label, value: ([key]) => key },
      { header: 'Count', value: ([, value]) => formatInt(value), align: 'right' },
    ],
  );

const previewBlock = (preview: ExportPreview): string =>
  sections(
    heading(3, `${preview.name} (${formatInt(preview.rowCount)} rows)`),
    `\`${preview.path}\``,
    table(
      preview.rows.slice(0, PREVIEW_ROWS),
      preview.columns.map((column) => ({ header: column, value: (row) => row[column] })),
    ),
  ).trimEnd();

const previewsFor = (census: string, exports: readonly ExportPreview[]): string[] =>
  exports.filter((preview) => CENSUS_OF_EXPORT[preview.name] === census).map(previewBlock);

export const renderSnapshot = ({ snapshot }: Summary): string =>
  sections(
    heading(2, 'Snapshot'),
    keyValueTable([
      ['Network', snapshot.network],
      ['Snapshot ledger', formatInt(snapshot.snapshotLedger)],
      ['Snapshot time', snapshot.snapshotTime],
      ['Measured ledger close (s)', snapshot.ledgerCloseSeconds.toFixed(3)],
      ['Git SHA', snapshot.gitSha],
    ]),
  );

export const renderHeadline = (summary: Summary): string => {
  const { contracts, failures, anchors, rent } = summary;
  return sections(
    heading(2, 'Headline'),
    keyValueTable([
      ['Contracts enumerated', formatInt(contracts.total)],
      ['Contract instances archived', formatInt(contracts.archivedInstances)],
      [
        'Contract instances archived (active: 100+ invocations or SCF-funded)',
        formatInt(contracts.archivedMeaningful),
      ],
      ['Contract instances expiring within 30 days', formatInt(contracts.expiring30d)],
      [
        'Contract instances expiring within 30 days (active)',
        formatInt(contracts.expiring30dMeaningful),
      ],
      ['SCF-funded contracts archived', formatInt(contracts.scfFunded.archived)],
      ['SCF-funded contracts expiring within 30 days', formatInt(contracts.scfFunded.expiring30d)],
      ['Transactions scanned in window', formatInt(failures.txScanned)],
      ['Failed transactions in window', formatInt(failures.txFailed)],
      ['Failed transactions with a preventable code', formatInt(failures.preventable.total)],
      ['Preventable share of failed', formatPercent(failures.preventable.total, failures.txFailed)],
      ['Failure clusters', formatInt(failures.clusters.count)],
      ['Anchor domains tested', formatInt(anchors.domainsTested)],
      ['Anchor domains passing anchor tests', formatInt(anchors.funnel.testsPassed)],
      ['12-month rent for live instances (XLM)', formatXlm(rent.totalXlm12m)],
    ]),
  );
};

const renderFailures = ({ failures }: Summary, exports: readonly ExportPreview[]): string =>
  sections(
    heading(2, 'Census 2: failed transactions'),
    keyValueTable([
      ['Window start', failures.windowStart],
      ['Window end', failures.windowEnd],
      ['Ledgers scanned', formatInt(failures.ledgersScanned)],
      ['Transactions scanned', formatInt(failures.txScanned)],
      ['Failed', formatInt(failures.txFailed)],
      ['Failed share', formatPercent(failures.txFailed, failures.txScanned)],
      ['Clusters', formatInt(failures.clusters.count)],
      ['Clusters on anchor distribution accounts', formatInt(failures.clusters.anchorDistribution)],
    ]),
    heading(3, 'Preventable codes'),
    countTable(failures.preventable.byCode, 'Code'),
    heading(3, 'All result codes'),
    countTable(failures.byCode, 'Code'),
    ...previewsFor('failures', exports),
  );

const renderContracts = ({ contracts }: Summary, exports: readonly ExportPreview[]): string =>
  sections(
    heading(2, 'Census 1: contract state archival'),
    keyValueTable([
      ['Contracts', formatInt(contracts.total)],
      ['Wasm families', formatInt(contracts.families)],
      ['Archived instances', formatInt(contracts.archivedInstances)],
      [
        'Archived instances (active: 100+ invocations or SCF-funded)',
        formatInt(contracts.archivedMeaningful),
      ],
      ['Expiring within 30 days', formatInt(contracts.expiring30d)],
      ['Expiring within 30 days (active)', formatInt(contracts.expiring30dMeaningful)],
      ['Expiring within 90 days', formatInt(contracts.expiring90d)],
      ['Live and idle', formatInt(contracts.liveIdle)],
      ['SCF-funded contracts', formatInt(contracts.scfFunded.total)],
      ['SCF-funded archived', formatInt(contracts.scfFunded.archived)],
      ['SCF-funded expiring within 30 days', formatInt(contracts.scfFunded.expiring30d)],
    ]),
    heading(3, 'Archived instances by wasm family'),
    countTable(contracts.archivedByFamily, 'Wasm'),
    ...previewsFor('contracts', exports),
  );

const renderAnchors = ({ anchors }: Summary, exports: readonly ExportPreview[]): string =>
  sections(
    heading(2, 'Census 3: anchor conformance'),
    keyValueTable([
      ['Domains tested', formatInt(anchors.domainsTested)],
      ['stellar.toml reachable', formatInt(anchors.funnel.tomlReachable)],
      ['SIGNING_KEY present', formatInt(anchors.funnel.signingKey)],
      ['SEP endpoints present', formatInt(anchors.funnel.endpoints)],
      ['/info readable', formatInt(anchors.funnel.infoReadable)],
      ['SEP-10 challenge valid', formatInt(anchors.funnel.sep10)],
      ['anchor tests passed', formatInt(anchors.funnel.testsPassed)],
    ]),
    heading(3, 'Per SEP'),
    table(Object.entries(anchors.perSep), [
      { header: 'SEP', value: ([sep]) => sep },
      { header: 'Tested', value: ([, s]) => formatInt(s.tested), align: 'right' },
      { header: 'Passed', value: ([, s]) => formatInt(s.passed), align: 'right' },
    ]),
    ...previewsFor('anchors', exports),
  );

const renderRent = ({ rent }: Summary, exports: readonly ExportPreview[]): string =>
  sections(
    heading(2, 'Census 4: rent'),
    keyValueTable([
      ['Contracts estimated', formatInt(rent.contractsEstimated)],
      ['Total 12-month rent (XLM)', formatXlm(rent.totalXlm12m)],
      ['Median 12-month rent (XLM)', formatXlm(rent.medianXlm12m)],
      ['SCF-funded 12-month rent (XLM)', formatXlm(rent.scfFundedXlm12m)],
      ['XLM/USD', `${rent.xlmUsd.price} (${rent.xlmUsd.source}, ${rent.xlmUsd.at})`],
      ['Total 12-month rent (USD)', formatXlm(rent.totalXlm12m * rent.xlmUsd.price)],
    ]),
    ...previewsFor('rent', exports),
  );

const renderRuns = (runs: readonly CensusRun[]): string =>
  table(runs, [
    { header: 'Census', value: (run) => run.census },
    { header: 'Wall time (s)', value: (run) => (run.wallMs / 1000).toFixed(1), align: 'right' },
    { header: 'Requests', value: (run) => formatInt(run.requests), align: 'right' },
    { header: 'Network calls', value: (run) => formatInt(run.networkCalls), align: 'right' },
    { header: 'Cache hits', value: (run) => formatInt(run.cachedHits), align: 'right' },
    { header: 'Gaps', value: (run) => formatInt(run.gaps), align: 'right' },
    { header: 'Skipped', value: (run) => run.skipped ?? '' },
  ]);

const renderMethod = (entry: MethodEntry): string =>
  sections(
    heading(3, entry.census),
    entry.endpoints.map((endpoint) => `- \`${endpoint}\``).join('\n'),
    keyValueTable(Object.entries(entry.parameters)),
    entry.notes.map((note) => `- ${note}`).join('\n'),
  ).trimEnd();

const renderMethodology = (inputs: ReportInputs): string =>
  sections(
    heading(2, 'Methodology'),
    renderRuns(inputs.runs),
    ...inputs.methodology.map(renderMethod),
  );

const renderAppendix = (exports: readonly ExportPreview[]): string =>
  sections(
    heading(2, 'Appendix: exports'),
    exports.map((preview) => `- [\`${preview.path}\`](${preview.path})`).join('\n'),
  );

export const renderReport = (inputs: ReportInputs): string =>
  sections(
    heading(1, 'Stellar Harness report'),
    renderSnapshot(inputs.summary),
    renderHeadline(inputs.summary),
    renderFailures(inputs.summary, inputs.exports),
    renderContracts(inputs.summary, inputs.exports),
    renderAnchors(inputs.summary, inputs.exports),
    renderRent(inputs.summary, inputs.exports),
    renderMethodology(inputs),
    renderAppendix(inputs.exports),
  );
