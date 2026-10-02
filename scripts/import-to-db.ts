import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { Network } from '@harness/schema';
import {
  closeSql,
  createSql,
  dataDirFor,
  formatCounts,
  type ImportCounts,
  importCache,
  importDerived,
  importFindings,
  importState,
  importSummary,
  migrate,
} from '@harness/storage';
import { loadDotEnv } from './env';

const PROGRESS_INTERVAL_MS = 2000;
const STEPS = ['cache', 'findings', 'summary', 'state', 'derived'] as const;
type Step = (typeof STEPS)[number];

loadDotEnv();

const { values } = parseArgs({
  options: {
    network: { type: 'string', default: 'mainnet' },
    limit: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    only: { type: 'string' },
  },
});

const network = Network.parse(values.network);
const limit = values.limit ? Number.parseInt(values.limit, 10) : undefined;
const dryRun = values['dry-run'];
const only = new Set(values.only ? values.only.split(',') : STEPS);
const unknown = [...only].filter((step) => !STEPS.includes(step as Step));
if (unknown.length > 0) throw new Error(`Unknown --only steps: ${unknown.join(', ')}`);
if (limit !== undefined && !(limit > 0)) throw new Error('--limit must be a positive integer');

const root = resolve(import.meta.dirname, '..');
const dataDir = dataDirFor(resolve(root, process.env.HARNESS_DATA_DIR ?? './data'), network);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl && !dryRun) throw new Error('DATABASE_URL is not set (or pass --dry-run)');

const sql = databaseUrl && !dryRun ? createSql(databaseUrl) : null;

const progress = (started: number) => {
  let last = 0;
  return (label: string, counts: ImportCounts) => {
    const now = Date.now();
    if (now - last < PROGRESS_INTERVAL_MS) return;
    last = now;
    process.stderr.write(`${formatCounts(label, counts, now - started)}\n`);
  };
};

const run = async (
  label: string,
  task: (onProgress: ReturnType<typeof progress>) => Promise<ImportCounts>,
) => {
  const started = Date.now();
  const counts = await task(progress(started));
  console.log(formatCounts(label, counts, Date.now() - started));
};

const main = async () => {
  console.log(
    `import ${network} from ${dataDir}${dryRun ? ' (dry run)' : ''}${limit ? ` limit ${limit}` : ''}`,
  );
  if (sql) {
    const applied = await migrate(sql);
    if (applied.length > 0) console.log(`applied migrations: ${applied.join(', ')}`);
  }
  const options = { limit, dryRun };
  if (only.has('cache')) {
    await run('cache', (onProgress) =>
      importCache(sql, network, dataDir, { ...options, onProgress }),
    );
  }
  if (only.has('findings')) {
    await run('findings', (onProgress) =>
      importFindings(sql, network, dataDir, { ...options, onProgress }),
    );
  }
  if (only.has('summary'))
    await run('summary', () => importSummary(sql, network, dataDir, options));
  if (only.has('state')) await run('state', () => importState(sql, network, dataDir, options));
  if (only.has('derived')) {
    const started = Date.now();
    const { rows, artifacts } = await importDerived(sql, network, dataDir, {
      ...options,
      onProgress: progress(started),
    });
    console.log(formatCounts('derived rows', rows, Date.now() - started));
    console.log(formatCounts('derived artifacts', artifacts, Date.now() - started));
  }
};

try {
  await main();
} finally {
  if (databaseUrl) await closeSql(databaseUrl);
}
