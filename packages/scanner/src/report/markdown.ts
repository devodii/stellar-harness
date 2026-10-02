export type Column<TRow> = {
  header: string;
  value: (row: TRow) => string | number | null | undefined;
  align?: 'left' | 'right';
};

const escapeCell = (value: string | number | null | undefined): string =>
  value === null || value === undefined
    ? ''
    : String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');

export const table = <TRow>(rows: readonly TRow[], columns: readonly Column<TRow>[]): string => {
  if (rows.length === 0) return '_no rows_';
  const header = `| ${columns.map((column) => column.header).join(' | ')} |`;
  const divider = `| ${columns.map((column) => (column.align === 'right' ? '---:' : '---')).join(' | ')} |`;
  const body = rows.map(
    (row) => `| ${columns.map((column) => escapeCell(column.value(row))).join(' | ')} |`,
  );
  return [header, divider, ...body].join('\n');
};

export const keyValueTable = (entries: readonly (readonly [string, string | number])[]): string =>
  table(entries, [
    { header: 'Metric', value: ([key]) => key },
    { header: 'Value', value: ([, value]) => value, align: 'right' },
  ]);

export const heading = (level: 1 | 2 | 3, text: string): string => `${'#'.repeat(level)} ${text}`;

export const formatInt = (value: number): string => value.toLocaleString('en-US');

export const formatXlm = (value: number): string =>
  value.toLocaleString('en-US', { maximumFractionDigits: 2 });

export const formatPercent = (part: number, whole: number): string =>
  whole === 0 ? '0%' : `${((part / whole) * 100).toFixed(1)}%`;

export const sections = (...blocks: (string | false | null | undefined)[]): string =>
  `${blocks.filter(Boolean).join('\n\n')}\n`;
