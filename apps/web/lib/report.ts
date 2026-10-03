import 'server-only';
import { getReportFile, listReportFiles } from '@harness/storage/report';
import { cache } from 'react';
import { parseCsv } from './csv';
import { db } from './db';
import {
  CENSUSES,
  REPORT_CSVS,
  type Report,
  type ReportSummary,
  type RunRecord,
} from './report-model';

const readText = async (name: string): Promise<string | null> =>
  (await getReportFile(await db(), name))?.body ?? null;

export const loadReport = cache(async (): Promise<Report | null> => {
  const summary = await readText('summary.json');
  if (!summary) return null;
  const [files, runs, csvs] = await Promise.all([
    listReportFiles(await db()),
    Promise.all(
      CENSUSES.map(async (census) => [census, await readText(`run_${census}.json`)] as const),
    ),
    Promise.all(REPORT_CSVS.map(async (name) => [name, await readText(name)] as const)),
  ]);
  return {
    summary: JSON.parse(summary) as ReportSummary,
    files,
    runs: Object.fromEntries(
      runs.flatMap(([census, text]) => (text ? [[census, JSON.parse(text) as RunRecord]] : [])),
    ),
    csv: Object.fromEntries(
      csvs.map(([name, text]) => [name, text ? parseCsv(text) : []]),
    ) as Report['csv'],
  };
});
