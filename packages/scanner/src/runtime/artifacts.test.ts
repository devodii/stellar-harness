import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PREVIEW_LIMIT,
  readCensusRecords,
  readPreviews,
  writeCensusRecord,
  writeExport,
} from './artifacts';

const tempDir = () => mkdtemp(join(tmpdir(), 'harness-artifacts-'));

describe('writeExport', () => {
  it('writes the csv and a capped preview', async () => {
    const dataDir = await tempDir();
    const rows = Array.from({ length: PREVIEW_LIMIT + 5 }, (_, i) => ({ id: `c${i}`, n: i }));
    const preview = await writeExport(dataDir, 'sample', rows, [
      'id',
      { header: 'double', value: (row) => row.n * 2 },
    ]);
    expect(preview).toMatchObject({ name: 'sample', rowCount: 25, columns: ['id', 'double'] });
    expect(preview.rows).toHaveLength(PREVIEW_LIMIT);
    expect(preview.rows[3]).toEqual({ id: 'c3', double: 6 });
    const csv = await readFile(join(dataDir, 'exports', 'sample.csv'), 'utf8');
    expect(csv.split('\n')[0]).toBe('id,double');
    expect(await readPreviews(dataDir)).toEqual([preview]);
  });
});

describe('census records', () => {
  it('round trips run records and returns nothing for an empty dir', async () => {
    const dataDir = await tempDir();
    expect(await readCensusRecords(dataDir)).toEqual([]);
    const record = {
      run: { census: 'rent', wallMs: 10, requests: 2, networkCalls: 0, cachedHits: 2, gaps: 0 },
      method: { census: 'Census 4: rent', endpoints: [], parameters: {}, notes: [] },
      summary: null,
      stats: { simulated: 2 },
    };
    await writeCensusRecord(dataDir, record);
    expect(await readCensusRecords(dataDir)).toEqual([record]);
  });
});
