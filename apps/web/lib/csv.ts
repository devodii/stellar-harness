export type CsvRow = Record<string, string>;

const parseRecords = (text: string): string[][] => {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = '';
  let quoted = false;
  const endCell = () => {
    record.push(cell);
    cell = '';
  };
  const endRecord = () => {
    endCell();
    if (record.length > 1 || record[0] !== '') records.push(record);
    record = [];
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') endCell();
    else if (char === '\n') endRecord();
    else if (char !== '\r') cell += char;
  }
  if (cell !== '' || record.length > 0) endRecord();
  return records;
};

export const parseCsv = (text: string): CsvRow[] => {
  const [columns, ...records] = parseRecords(text);
  if (!columns) return [];
  return records.map((cells) =>
    Object.fromEntries(columns.map((column, index) => [column, cells[index] ?? ''])),
  );
};
