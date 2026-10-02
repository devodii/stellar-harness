import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  createDerivedWriter,
  createJsonlWriter,
  derivedPath,
  escapeCsv,
  toCsv,
  writeCsv,
} from './derived';

const tempDir = () => mkdtemp(join(tmpdir(), 'harness-derived-'));
const lines = async (path: string) => (await readFile(path, 'utf8')).trim().split('\n');

describe('jsonl writer', () => {
  it('batches rows into data/derived/<name>.jsonl', async () => {
    const dataDir = await tempDir();
    const writer = createDerivedWriter<{ ledger: number }>(dataDir, 'ledger_totals', {
      batchSize: 2,
    });
    expect(writer.path).toBe(derivedPath(dataDir, 'ledger_totals'));
    await writer.write({ ledger: 1 });
    await writer.write({ ledger: 2 });
    expect(await lines(writer.path)).toHaveLength(2);
    await writer.write({ ledger: 3 });
    expect(await lines(writer.path)).toHaveLength(2);
    await writer.close();
    expect((await lines(writer.path)).map((line) => JSON.parse(line).ledger)).toEqual([1, 2, 3]);
    expect(writer.written).toBe(3);
  });

  it('appends on resume and truncates in replace mode', async () => {
    const path = join(await tempDir(), 'derived', 'x.jsonl');
    const first = createJsonlWriter<number>(path);
    await first.writeMany([1, 2]);
    await first.close();
    const resumed = createJsonlWriter<number>(path);
    await resumed.write(3);
    await resumed.close();
    expect(await lines(path)).toEqual(['1', '2', '3']);
    const fresh = createJsonlWriter<number>(path, { mode: 'replace' });
    await fresh.write(9);
    await fresh.close();
    expect(await lines(path)).toEqual(['9']);
  });

  it('creates an empty file when replacing with no rows', async () => {
    const path = join(await tempDir(), 'empty.jsonl');
    await createJsonlWriter(path, { mode: 'replace' }).close();
    expect(await readFile(path, 'utf8')).toBe('');
  });

  it('validates rows against an optional schema', async () => {
    const writer = createJsonlWriter(join(await tempDir(), 'v.jsonl'), {
      schema: z.object({ hash: z.string() }),
    });
    await expect(writer.write({ hash: 1 } as never)).rejects.toThrow();
  });
});

describe('csv', () => {
  it('escapes commas, quotes and newlines', () => {
    expect(escapeCsv('plain')).toBe('plain');
    expect(escapeCsv('a,b')).toBe('"a,b"');
    expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsv('line\nbreak')).toBe('"line\nbreak"');
    expect(escapeCsv(null)).toBe('');
    expect(escapeCsv(['a', 'b'])).toBe('a;b');
    expect(escapeCsv({ k: 1 })).toBe('"{""k"":1}"');
  });

  it('renders a header and rows from keys and computed columns', () => {
    const rows = [
      { domain: 'anchor.example', country: null, stages: 2 },
      { domain: 'x,y.example', country: 'MX', stages: 3 },
    ];
    expect(
      toCsv(rows, ['domain', 'country', { header: 'stage_count', value: (row) => row.stages }]),
    ).toBe('domain,country,stage_count\nanchor.example,,2\n"x,y.example",MX,3\n');
  });

  it('writes csv files, creating directories', async () => {
    const path = join(await tempDir(), 'exports', 'out.csv');
    await writeCsv(path, [{ a: 1 }], ['a']);
    expect(await readFile(path, 'utf8')).toBe('a\n1\n');
  });
});
