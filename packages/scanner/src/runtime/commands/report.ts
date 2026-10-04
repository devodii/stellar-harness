import { writeFile } from 'node:fs/promises';
import type { z } from 'zod';
import { renderReport } from '../../report/render';
import {
  AnchorsSummary,
  ContractsSummary,
  emptySummary,
  FailuresSummary,
  FINDING_TYPES,
  RentSummary,
  Summary,
} from '../../schema';
import { type CensusRecord, readCensusRecords, readPreviews } from '../artifacts';
import type { ScanContext } from '../context';

const EXPORT_ORDER = [
  'failed_tx_by_code',
  'failure_clusters',
  'anchors_failing',
  'anchors_funnel',
  'contracts_archived',
  'contracts_archived_meaningful',
  'contracts_expiring_30d',
  'contracts_scf_funded',
  'rent_top100',
];

const RUN_ORDER = ['anchors', 'contracts', 'rent', 'failures'];

const summaryOf = <S extends z.ZodType>(
  records: CensusRecord<unknown>[],
  census: string,
  schema: S,
  fallback: z.infer<S>,
): z.infer<S> => {
  const parsed = schema.safeParse(records.find((record) => record.run.census === census)?.summary);
  return parsed.success ? parsed.data : fallback;
};

export const buildSummary = async (ctx: ScanContext): Promise<Summary> => {
  const records = await readCensusRecords(ctx.persistence);
  const empty = emptySummary(ctx.snapshot);
  const findings = await ctx.sink.storage.listFindings();
  const findingsCount: Summary['findingsCount'] = {};
  for (const type of FINDING_TYPES) {
    const total = findings.filter((finding) => finding.type === type).length;
    if (total > 0) findingsCount[type] = total;
  }
  return Summary.parse({
    snapshot: ctx.snapshot,
    contracts: summaryOf(records, 'contracts', ContractsSummary, empty.contracts),
    failures: summaryOf(records, 'failures', FailuresSummary, empty.failures),
    anchors: summaryOf(records, 'anchors', AnchorsSummary, empty.anchors),
    rent: summaryOf(records, 'rent', RentSummary, empty.rent),
    findingsCount,
  });
};

const byOrder =
  (order: readonly string[]) =>
  <T>(key: (item: T) => string) =>
  (a: T, b: T) =>
    order.indexOf(key(a)) - order.indexOf(key(b));

export const reportCommand = async (ctx: ScanContext, reportPath: string) => {
  const summary = await buildSummary(ctx);
  await ctx.sink.storage.putSummary(summary);
  const records = (await readCensusRecords(ctx.persistence)).sort(
    byOrder(RUN_ORDER)((record) => record.run.census),
  );
  const exports = (await readPreviews(ctx.persistence)).sort(
    byOrder(EXPORT_ORDER)((preview) => preview.name),
  );
  await writeFile(
    reportPath,
    renderReport({
      summary,
      exports,
      methodology: records.map((record) => record.method),
      runs: records.map((record) => record.run),
    }),
  );
  ctx.log(`[report] wrote ${reportPath} and summary.json`);
  return { run: null, findings: 0 };
};
