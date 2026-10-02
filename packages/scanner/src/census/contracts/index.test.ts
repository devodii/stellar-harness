import { codeKeyXdr } from '@harness/stellar-tools/contracts';
import { fakeFetcher, fakeRpc } from '@harness/stellar-tools/contracts/testing';
import { describe, expect, it } from 'vitest';
import page1 from './__fixtures__/expert-contracts-page-1.json';
import page2 from './__fixtures__/expert-contracts-page-2.json';
import batch from './__fixtures__/rpc-instance-entries.json';
import projects from './__fixtures__/stellarlight-projects-scf.json';
import repos from './__fixtures__/stellarlight-repos.json';
import { CONTRACT_ROWS_DERIVED, runContractsCensus } from './index';
import { memorySinks, sequentialRun } from './testing';

const EXPERT = 'https://api.stellar.expert/explorer/public';
const LIGHT = 'https://stellarlight.xyz';
const records = [...page1._embedded.records, ...page2._embedded.records];
const wasms = [...new Set(records.flatMap((record) => (record.wasm ? [record.wasm] : [])))];

const fetch = fakeFetcher({
  [`${EXPERT}/contract?limit=200&order=desc`]: { body: page1 },
  [`https://api.stellar.expert${page1._links.next.href}`]: { body: page2 },
  [`https://api.stellar.expert${page2._links.next.href}`]: {
    body: { _links: {}, _embedded: { records: [] } },
  },
  [`${LIGHT}/api/projects/search?scfAwarded=1&limit=50&offset=0`]: { body: projects },
  [`${LIGHT}/api/repos/search?minScore=0&limit=100&offset=0`]: { body: repos },
});

const rpc = fakeRpc({
  latestLedger: batch.latestLedger,
  entries: [
    ...batch.entries.map((item) => item.entry),
    ...wasms.map((wasm) => ({
      key: codeKeyXdr(wasm),
      xdr: '',
      liveUntilLedgerSeq: batch.latestLedger + 2_000_000,
    })),
  ],
});

const snapshot = {
  snapshotLedger: batch.latestLedger,
  snapshotTime: '2026-10-02T00:11:00.000Z',
  ledgerCloseSeconds: 5,
  gitSha: 'test',
  network: 'mainnet' as const,
};

describe('runContractsCensus', () => {
  it('runs enumeration, ttl, scf join, fingerprints, exports and summary end to end', async () => {
    const sinks = memorySinks();
    const result = await runContractsCensus({
      fetch,
      rpc,
      run: sequentialRun,
      snapshot,
      stellarExpertUrl: EXPERT,
      stellarlightUrl: LIGHT,
      ...sinks,
    });

    const archivedInBatch = batch.entries.filter(
      (item) => item.entry.liveUntilLedgerSeq < batch.latestLedger,
    ).length;
    expect(result.gaps).toEqual([]);
    expect(result.stats).toMatchObject({
      enumerated: records.length,
      pages: 3,
      enumerationComplete: true,
      ttl: { batches: 1, failedBatches: 0 },
    });
    expect(result.summary.total).toBe(records.length);
    expect(result.summary.archivedInstances).toBe(archivedInBatch);
    expect(result.exports.archived).toHaveLength(archivedInBatch);
    expect(sinks.derived[CONTRACT_ROWS_DERIVED]).toHaveLength(records.length);
    expect(
      sinks.findings.filter((finding) => finding.type === 'CONTRACT_INSTANCE_ARCHIVED'),
    ).toHaveLength(archivedInBatch);
    expect(sinks.findings.some((finding) => finding.type === 'CONTRACT_CODE_ARCHIVED')).toBe(false);
    expect(result.scfProjects.map((project) => project.slug)).toContain('reflector');
    expect(sinks.checkpoints.at(-1)).toMatchObject({ done: true, enumerated: records.length });
  });

  it('records a gap when stellarlight is unreachable and still finishes', async () => {
    const sinks = memorySinks();
    const partial = fakeFetcher({
      [`${EXPERT}/contract?limit=2&order=desc`]: { body: page1 },
    });
    const result = await runContractsCensus(
      {
        fetch: partial,
        rpc,
        run: sequentialRun,
        snapshot,
        stellarExpertUrl: EXPERT,
        stellarlightUrl: LIGHT,
        ...sinks,
      },
      { limit: 2 },
    );
    expect(result.stats.enumerated).toBe(2);
    expect(result.summary.scfFunded.total).toBe(0);
    expect(result.gaps.map((gap) => [gap.source, gap.error.code])).toEqual([
      ['stellarlight:projects', 'NOT_FOUND'],
      ['stellarlight:repos', 'NOT_FOUND'],
    ]);
  });
});
