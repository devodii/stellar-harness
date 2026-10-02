import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTRACT_ROWS_DERIVED } from '../../census/contracts/index';
import { contractRow, ttl } from '../../census/contracts/testing';
import { emptySummary } from '../../schema';
import { readPreviews } from '../artifacts';
import { filePersistence } from '../persistence';
import { backfillMeaningfulCounts, lacksMeaningfulCounts } from './meaningful-backfill';

const scf = { slug: 'blend', name: 'Blend', round: 21 };
const rows = [
  contractRow(1, { instance: ttl.archived(), invocations: 3 }),
  contractRow(2, { instance: ttl.archived(), invocations: 150 }),
  contractRow(3, { instance: ttl.archived(), scf }),
  contractRow(4, { instance: ttl.live(10), invocations: 400 }),
  contractRow(5, { instance: ttl.live(10) }),
];

const { contracts: empty } = emptySummary({
  snapshotLedger: 1,
  snapshotTime: '2026-10-02T00:00:00.000Z',
  ledgerCloseSeconds: 5,
  gitSha: 'abc',
  network: 'mainnet',
});
const stored = { ...empty, archivedInstances: 3, expiring30d: 2 };

const setup = async (derived: unknown[]) => {
  const persistence = filePersistence(await mkdtemp(join(tmpdir(), 'harness-backfill-')));
  await persistence.appendDerived(CONTRACT_ROWS_DERIVED, derived);
  const lines: string[] = [];
  const ctx = {
    persistence,
    readDerived: persistence.readDerived,
    log: (line: string) => lines.push(line),
  };
  return { ctx, persistence, lines };
};

describe('lacksMeaningfulCounts', () => {
  it('flags a summary from before the meaningful counts existed', () => {
    expect(lacksMeaningfulCounts(stored)).toBe(true);
    expect(lacksMeaningfulCounts(empty)).toBe(false);
    expect(lacksMeaningfulCounts({ ...stored, archivedMeaningful: 1 })).toBe(false);
  });
});

describe('backfillMeaningfulCounts', () => {
  it('recomputes the counts from stored contract rows and writes the export', async () => {
    const { ctx, persistence, lines } = await setup(rows);
    const contracts = await backfillMeaningfulCounts(ctx, stored);
    expect(contracts).toMatchObject({ archivedMeaningful: 2, expiring30dMeaningful: 1 });
    const [preview] = await readPreviews(persistence);
    expect(preview).toMatchObject({ name: 'contracts_archived_meaningful', rowCount: 2 });
    const csv = await readFile(
      join(persistence.dataDir, 'exports/contracts_archived_meaningful.csv'),
      'utf8',
    );
    expect(csv.split('\n')[0]).toBe(
      'contract,wasm,family_size,created,invocations,live_until_ledger,days_left,scf_slug,scf_round',
    );
    expect(lines).toHaveLength(1);
  });

  it('keeps counts that are already present', async () => {
    const { ctx } = await setup(rows);
    const current = { ...stored, archivedMeaningful: 7, expiring30dMeaningful: 4 };
    expect(await backfillMeaningfulCounts(ctx, current)).toBe(current);
  });

  it('keeps the summary when no rows were stored', async () => {
    const { ctx } = await setup([]);
    expect(await backfillMeaningfulCounts(ctx, stored)).toBe(stored);
  });
});
