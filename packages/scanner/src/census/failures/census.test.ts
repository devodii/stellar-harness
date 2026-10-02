import { describe, expect, it } from 'vitest';
import { appError, err } from '../../schema';
import { censusSnapshot, encodedTx, recordingDeps } from './__tests__/census-harness';
import { fakeHorizon, fakeRpc, pagedRpc } from './__tests__/fakes';
import { runFailuresCensus } from './census';
import type { RpcPort, RpcTransaction } from './ports';

const BAD_SEQ = 'GBADSEQ';
const NO_TRUST = 'GNOTRUST';

const network = (): RpcTransaction[] => {
  const txs: RpcTransaction[] = [];
  for (let ledger = 901; ledger <= 1000; ledger += 1) {
    let order = 1;
    txs.push(encodedTx(ledger, order++));
    txs.push(encodedTx(ledger, order++));
    if (ledger % 4 === 0) {
      txs.push(encodedTx(ledger, order++, { account: BAD_SEQ, codes: ['tx_bad_seq'] }));
    }
    if (ledger === 960) {
      txs.push(encodedTx(ledger, order++, { account: BAD_SEQ, codes: ['tx_bad_seq'] }));
    }
    if (ledger % 9 === 0) {
      txs.push(
        encodedTx(ledger, order++, { account: NO_TRUST, codes: ['tx_failed', 'op_no_trust'] }),
      );
    }
    if (ledger === 950) {
      txs.push(
        encodedTx(ledger, order++, {
          account: 'GOTHER',
          codes: ['tx_failed', 'op_too_few_offers'],
        }),
      );
    }
  }
  return txs;
};

const bounds = { oldestLedger: 1, latestLedger: 1005 };

const options = {
  snapshot: censusSnapshot,
  window: '500s',
  chunkLedgers: 10,
  retentionMarginLedgers: 0,
  pageLimit: 7,
};

const horizon = () =>
  fakeHorizon({
    accounts: {},
    firstOperations: {},
  }).port;

describe('runFailuresCensus', () => {
  it('scans the window, writes derived rows, checkpoints and emits cluster findings', async () => {
    const { rpc, calls } = pagedRpc(network(), bounds);
    const { deps, derived, emitted, checkpoints } = recordingDeps(rpc, horizon());
    let clock = 0;
    deps.now = () => {
      clock += 1000;
      return clock;
    };
    const result = await runFailuresCensus(deps, options);
    if (!result.ok) throw new Error(result.error.message);
    const { value } = result;

    expect(value.window).toMatchObject({ startLedger: 901, endLedger: 1000, ledgers: 100 });
    expect(derived.get('ledger_totals')).toHaveLength(100);
    expect(derived.get('failed_tx')).toHaveLength(25 + 1 + 11 + 1);
    expect(checkpoints.at(-1)).toMatchObject({ completedThrough: 1000, completedChunkIds: [] });
    expect(checkpoints.map((c) => c.completedThrough)).toEqual([
      910, 920, 930, 940, 950, 960, 970, 980, 990, 1000,
    ]);

    expect(emitted.map((f) => [f.type, f.subject])).toEqual([
      ['TX_BAD_SEQ_CLUSTER', BAD_SEQ],
      ['OP_NO_TRUST_CLUSTER', NO_TRUST],
    ]);
    expect(emitted[0]?.evidence).toMatchObject({
      count: 26,
      firstLedger: 904,
      lastLedger: 1000,
      sameLedgerCollisions: 2,
    });
    expect(emitted[0]?.tags).toEqual(['failures']);

    expect(value.aggregate).toMatchObject({
      ledgersScanned: 100,
      txFailed: 38,
      preventable: { total: 37, byCode: { tx_bad_seq: 26, op_no_trust: 11 } },
      other: { total: 1 },
    });
    expect(value.summary).toMatchObject({
      windowEnd: '2026-10-02T00:00:00.000Z',
      ledgersScanned: 100,
      clusters: { count: 2, anchorDistribution: 0, domains: [] },
    });
    expect(value.stats).toMatchObject({
      ledgers: 100,
      tx: 238,
      failed: 38,
      calls: { rpc: calls.length, horizon: 4 },
      chunks: { planned: 10, scanned: 10, failed: 0, resumed: 0 },
      decodeErrors: 0,
    });
    expect(value.stats.ledgersPerSecond).toBeGreaterThan(0);
    expect(value.stats.txPerSecond).toBeGreaterThan(0);
  });

  it('retries a chunk that failed once', async () => {
    const { rpc } = pagedRpc(network(), bounds);
    let failedOnce = false;
    const flaky = fakeRpc({
      getTransactions: async (params) => {
        if (params.startLedger === 931 && !failedOnce) {
          failedOnce = true;
          return err(appError('UPSTREAM_TIMEOUT', 'timeout'));
        }
        return rpc.getTransactions(params);
      },
    });
    const { deps, checkpoints } = recordingDeps(flaky, horizon());
    const result = await runFailuresCensus(deps, options);
    expect(result.ok && result.value.stats.chunks).toMatchObject({ scanned: 10, failed: 0 });
    expect(checkpoints.at(-1)?.completedThrough).toBe(1000);
  });

  it('holds the checkpoint behind a persistently failing chunk but keeps later chunks', async () => {
    const { rpc } = pagedRpc(network(), bounds);
    const broken: RpcPort = fakeRpc({
      getTransactions: async (params) =>
        params.startLedger === 931
          ? err(appError('UPSTREAM_FAILED', 'bad gateway'))
          : rpc.getTransactions(params),
    });
    const { deps, derived, checkpoints } = recordingDeps(broken, horizon());
    const result = await runFailuresCensus(deps, options);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.gaps.chunks).toEqual([
      { chunk: { id: 3, start: 931, end: 940 }, message: 'bad gateway' },
    ]);
    expect(checkpoints.at(-1)).toMatchObject({
      completedThrough: 930,
      completedChunkIds: [4, 5, 6, 7, 8, 9],
    });
    expect(derived.get('ledger_totals')).toHaveLength(90);
  });

  it('resumes from a checkpoint and reaches the same aggregate as a full run', async () => {
    const full = pagedRpc(network(), bounds);
    const reference = recordingDeps(full.rpc, horizon());
    const fullRun = await runFailuresCensus(reference.deps, options);

    const brokenBase = pagedRpc(network(), bounds);
    const broken = fakeRpc({
      getTransactions: async (params) =>
        params.startLedger === 931
          ? err(appError('UPSTREAM_FAILED', 'bad gateway'))
          : brokenBase.rpc.getTransactions(params),
    });
    const first = recordingDeps(broken, horizon());
    await runFailuresCensus(first.deps, options);

    const resumed = pagedRpc(network(), bounds);
    const second = recordingDeps(resumed.rpc, horizon());
    for (const [name, rows] of first.derived) second.derived.set(name, [...rows]);
    second.deps.previousCheckpoint = first.checkpoints.at(-1);
    const resumedRun = await runFailuresCensus(second.deps, options);

    const starts = resumed.calls.flatMap((c) =>
      c.startLedger === undefined ? [] : [c.startLedger],
    );
    expect(starts).toEqual([990, 931]);
    if (!fullRun.ok || !resumedRun.ok) throw new Error('run failed');
    expect(resumedRun.value.aggregate).toEqual(fullRun.value.aggregate);
    expect(resumedRun.value.stats.chunks).toMatchObject({ resumed: 9, scanned: 1 });
    expect(second.checkpoints.at(-1)).toMatchObject({
      completedThrough: 1000,
      completedChunkIds: [],
    });
    expect(second.emitted.map((f) => f.type)).toEqual(reference.emitted.map((f) => f.type));
  });

  it('counts decode errors without failing the run', async () => {
    const txs = network();
    txs.push({ ...encodedTx(1000, 99, { account: 'GX', codes: ['tx_failed'] }), resultXdr: 'x' });
    const { rpc } = pagedRpc(txs, bounds);
    const { deps } = recordingDeps(rpc, horizon());
    const result = await runFailuresCensus(deps, options);
    expect(result.ok && result.value.stats.decodeErrors).toBe(1);
    expect(result.ok && result.value.gaps.decode[0]?.hash).toBe('1000-99');
  });

  it('applies the anchor domain set and classification tags to findings', async () => {
    const { rpc } = pagedRpc(network(), bounds);
    const { port } = fakeHorizon({
      accounts: {
        [BAD_SEQ]: {
          id: BAD_SEQ,
          sequence: '1',
          home_domain: 'anchor.example',
          subentry_count: 0,
          thresholds: { low_threshold: 0, med_threshold: 2, high_threshold: 2 },
          flags: {
            auth_required: false,
            auth_revocable: false,
            auth_immutable: false,
            auth_clawback_enabled: false,
          },
          signers: [],
          balances: [{ asset_type: 'native', balance: '100.0000000' }],
        },
      },
    });
    const { deps, emitted } = recordingDeps(rpc, port);
    await runFailuresCensus(deps, { ...options, anchorDomains: new Set(['anchor.example']) });
    expect(emitted[0]?.tags).toEqual([
      'failures',
      'multisig',
      'anchor_distribution',
      'domain:anchor.example',
    ]);
  });

  it('fails cleanly when the retention probe fails', async () => {
    const rpc = fakeRpc({
      getTransactions: async () => err(appError('UPSTREAM_TIMEOUT', 'down')),
    });
    const { deps } = recordingDeps(rpc, horizon());
    const result = await runFailuresCensus(deps, options);
    expect(result).toMatchObject({ ok: false, error: { code: 'UPSTREAM_TIMEOUT' } });
  });
});
