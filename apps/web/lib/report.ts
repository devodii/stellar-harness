import 'server-only';
import { getReportFile, listReportFiles } from '@harness/storage/report';
import Papa from 'papaparse';
import { cache } from 'react';
import { db } from './db';
import { type CsvRow, REPORT_CSVS, type Report, type ReportSummary } from './report-model';

const parseCsv = (text: string): CsvRow[] =>
  Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true }).data;

const readText = async (name: string): Promise<string | null> =>
  (await getReportFile(await db(), name))?.body ?? null;

export const loadReport = cache(async (): Promise<Report | null> => {
  const summary = await readText('summary.json');
  if (!summary) return null;
  const [files, csvs] = await Promise.all([
    listReportFiles(await db()),
    Promise.all(REPORT_CSVS.map(async (name) => [name, await readText(name)] as const)),
  ]);
  return {
    summary: JSON.parse(summary) as ReportSummary,
    files,
    csv: Object.fromEntries(
      csvs.map(([name, text]) => [name, text ? parseCsv(text) : []]),
    ) as Report['csv'],
  };
});
