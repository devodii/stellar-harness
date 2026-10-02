import { createReadStream } from 'node:fs';
import { access, readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createInterface } from 'node:readline';
import { Finding, type Network, Snapshot, Summary } from '@harness/schema';
import { z } from 'zod';
import { batched } from './batch';
import { insertFindings } from './findings';
import { emptyCounts, type ImportCounts, type ImportOptions } from './import-progress';
import { type ArtifactKind, insertDerivedRows, maxDerivedSeq, PgScanStore } from './scan-store';
import type { Sql } from './sql';
import { PostgresStorage } from './storage';

const FINDING_BATCH = 1000;
const DERIVED_BATCH = 1000;
const DERIVED_BATCH_BYTES = 8 * 1024 * 1024;

const isMissing = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

const readJsonFile = async (path: string): Promise<unknown | undefined> => {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw error;
  }
};

const listFiles = async (dir: string): Promise<string[]> => {
  try {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name))
      .sort();
  } catch (error) {
    if (isMissing(error)) return [];
    throw error;
  }
};

type Line = { seq: number; text: string };

async function* jsonlLines(path: string, limit: number): AsyncIterable<Line> {
  try {
    await access(path);
  } catch (error) {
    if (isMissing(error)) return;
    throw error;
  }
  const stream = createReadStream(path, { encoding: 'utf8' });
  const lines = createInterface({ input: stream, crlfDelay: Number.POSITIVE_INFINITY });
  let seq = 0;
  try {
    for await (const text of lines) {
      if (!text.trim()) continue;
      if (seq >= limit) return;
      seq += 1;
      yield { seq, text };
    }
  } finally {
    lines.close();
    stream.destroy();
  }
}

const parseLine = <T>(text: string, schema: z.ZodType<T>): T | null => {
  try {
    const parsed = schema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const importFindings = async (
  sql: Sql | null,
  network: Network,
  dataDir: string,
  { limit = Number.POSITIVE_INFINITY, dryRun = false, onProgress }: ImportOptions = {},
): Promise<ImportCounts> => {
  const counts = emptyCounts();
  const lines = jsonlLines(join(dataDir, 'findings.jsonl'), limit);
  for await (const batch of batched(lines, { maxRows: FINDING_BATCH })) {
    const findings: Finding[] = [];
    for (const line of batch) {
      counts.scanned += 1;
      counts.bytes += line.text.length;
      const finding = parseLine(line.text, Finding);
      if (finding) findings.push(finding);
      else counts.invalid += 1;
    }
    if (sql && !dryRun) {
      const inserted = await insertFindings(sql, network, findings);
      counts.inserted += inserted;
      counts.existing += findings.length - inserted;
    }
    onProgress?.('findings', counts);
  }
  return counts;
};

export const importSummary = async (
  sql: Sql | null,
  network: Network,
  dataDir: string,
  { dryRun = false }: ImportOptions = {},
): Promise<ImportCounts> => {
  const counts = emptyCounts();
  const raw = await readJsonFile(join(dataDir, 'summary.json'));
  if (raw === undefined) return counts;
  counts.scanned = 1;
  const summary = Summary.safeParse(raw);
  if (!summary.success) return { ...counts, invalid: 1 };
  if (!sql || dryRun) return counts;
  await new PostgresStorage(sql, network).putSummary(summary.data);
  return { ...counts, inserted: 1 };
};

const StateEnvelope = z.object({ name: z.string(), state: z.unknown() });

export const importState = async (
  sql: Sql | null,
  network: Network,
  dataDir: string,
  { dryRun = false }: ImportOptions = {},
): Promise<ImportCounts> => {
  const counts = emptyCounts();
  const store = sql && !dryRun ? new PgScanStore(sql, network) : null;
  for (const path of await listFiles(join(dataDir, 'state'))) {
    if (!path.endsWith('.json')) continue;
    counts.scanned += 1;
    const envelope = StateEnvelope.safeParse(await readJsonFile(path));
    if (!envelope.success) {
      counts.invalid += 1;
      continue;
    }
    if (envelope.data.name === 'snapshot') {
      const snapshot = Snapshot.safeParse(envelope.data.state);
      if (!snapshot.success) {
        counts.invalid += 1;
        continue;
      }
      await store?.putSnapshot(snapshot.data);
    } else {
      await store?.putArtifact('state', envelope.data.name, envelope.data);
    }
    if (store) counts.inserted += 1;
  }
  return counts;
};

const importDerivedFile = async (
  sql: Sql | null,
  network: Network,
  path: string,
  name: string,
  counts: ImportCounts,
  { limit = Number.POSITIVE_INFINITY, dryRun = false, onProgress }: ImportOptions,
) => {
  const writable = sql && !dryRun ? sql : null;
  const resumeAfter = writable ? await maxDerivedSeq(writable, network, name) : 0;
  const lines = jsonlLines(path, limit);
  for await (const batch of batched(lines, {
    maxRows: DERIVED_BATCH,
    maxBytes: DERIVED_BATCH_BYTES,
    sizeOf: (line) => line.text.length,
  })) {
    const rows: { seq: number; body: unknown }[] = [];
    for (const line of batch) {
      counts.scanned += 1;
      counts.bytes += line.text.length;
      if (line.seq <= resumeAfter) {
        counts.existing += 1;
        continue;
      }
      try {
        rows.push({ seq: line.seq, body: JSON.parse(line.text) });
      } catch {
        counts.invalid += 1;
      }
    }
    if (writable) counts.inserted += await insertDerivedRows(writable, network, name, rows);
    onProgress?.(`derived ${name}`, counts);
  }
};

const ARTIFACT_DIRS: { dir: string; kind: ArtifactKind }[] = [
  { dir: 'previews', kind: 'previews' },
  { dir: 'runs', kind: 'runs' },
];

export const derivedArtifactKey = (relativePath: string): { kind: ArtifactKind; name: string } => {
  const stem = relativePath.slice(0, -'.json'.length);
  const match = ARTIFACT_DIRS.find(({ dir }) => stem.startsWith(`${dir}/`));
  return match
    ? { kind: match.kind, name: stem.slice(match.dir.length + 1) }
    : { kind: 'derived', name: stem };
};

export const importDerived = async (
  sql: Sql | null,
  network: Network,
  dataDir: string,
  options: ImportOptions = {},
): Promise<{ rows: ImportCounts; artifacts: ImportCounts }> => {
  const rows = emptyCounts();
  const artifacts = emptyCounts();
  const derivedDir = join(dataDir, 'derived');
  const store = sql && !options.dryRun ? new PgScanStore(sql, network) : null;
  for (const path of await listFiles(derivedDir)) {
    const relativePath = relative(derivedDir, path);
    if (relativePath.endsWith('.jsonl') && !relativePath.includes('/')) {
      await importDerivedFile(sql, network, path, relativePath.slice(0, -6), rows, options);
    } else if (relativePath.endsWith('.json')) {
      artifacts.scanned += 1;
      const { kind, name } = derivedArtifactKey(relativePath);
      const body = await readJsonFile(path).catch(() => undefined);
      if (body === undefined) {
        artifacts.invalid += 1;
        continue;
      }
      await store?.putArtifact(kind, name, body);
      if (store) artifacts.inserted += 1;
    }
  }
  return { rows, artifacts };
};
