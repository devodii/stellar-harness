import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createPortDecoders } from '@harness/stellar-tools';
import { ANCHOR_DOMAINS_FILE } from '../../census/anchors/census';
import { runFailuresCensus } from '../../census/failures/census';
import {
  FAILED_TX_BY_CODE_COLUMNS,
  FAILURE_CLUSTERS_COLUMNS,
  failedTxByCodeRows,
  failureClusterRows,
} from '../../census/failures/export';
import { FailuresCheckpoint } from '../../census/failures/progress';
import { writeCensusRecord, writeExport } from '../artifacts';
import type { ScanContext } from '../context';
import { measure } from './measure';

const CENSUS = 'failures';

const readAnchorDomains = async (dataDir: string): Promise<Set<string>> => {
  try {
    const domains = JSON.parse(
      await readFile(join(dataDir, 'derived', ANCHOR_DOMAINS_FILE), 'utf8'),
    ) as { domain: string }[];
    return new Set(domains.map((entry) => entry.domain));
  } catch {
    return new Set();
  }
};

export const failuresCommand = async (ctx: ScanContext) => {
  const { config, ports, snapshot, options } = ctx;
  const saved = FailuresCheckpoint.safeParse(await ctx.readCheckpoint(CENSUS));
  const anchorDomains = await readAnchorDomains(options.dataDir);
  const window = options.windowSeconds ?? options.env?.FAILURE_WINDOW ?? process.env.FAILURE_WINDOW;

  const { value: result, run } = await measure(ctx, CENSUS, () =>
    runFailuresCensus(
      {
        ...createPortDecoders(config.NETWORK_PASSPHRASE),
        rpc: ports.rpc,
        horizon: ports.horizon,
        run: ctx.run,
        emit: ctx.emit,
        writeDerived: ctx.writeDerived,
        resetDerived: (name) => ctx.resetDerived(name),
        readDerived: ctx.readDerived,
        checkpoint: ctx.checkpointer(CENSUS),
        previousCheckpoint: saved.success ? saved.data : undefined,
      },
      {
        snapshot,
        window,
        rpcConcurrency: config.CONCURRENCY_RPC,
        horizonConcurrency: config.CONCURRENCY_HORIZON,
        anchorDomains,
        limitLedgers: options.limit,
      },
    ),
  );
  if (!result.ok) {
    ctx.log(`[failures] ${result.error.message}`);
    return { run, findings: 0 };
  }

  const { summary, findings, stats, gaps } = result.value;
  await writeExport(
    options.dataDir,
    'failed_tx_by_code',
    failedTxByCodeRows(summary.byCode, summary.txFailed),
    FAILED_TX_BY_CODE_COLUMNS,
  );
  await writeExport(
    options.dataDir,
    'failure_clusters',
    failureClusterRows(findings),
    FAILURE_CLUSTERS_COLUMNS,
  );
  await writeCensusRecord(options.dataDir, {
    run,
    summary,
    stats: {
      ...stats,
      window: result.value.window,
      chunkGaps: gaps.chunks.length,
      decodeGaps: gaps.decode.length,
      classificationGaps: gaps.classification.length,
    },
    method: {
      census: 'Census 2: failed transactions',
      endpoints: [
        `POST ${config.RPC_URL} getTransactions (limit 200, paged per 100-ledger chunk)`,
        `GET ${config.HORIZON_URL}/accounts/{id}`,
        `GET ${config.HORIZON_URL}/accounts/{id}/operations?order=asc&limit=1`,
      ],
      parameters: {
        network: config.NETWORK,
        window: String(window ?? '7d'),
        'start ledger': result.value.window.startLedger,
        'end ledger': result.value.window.endLedger,
        'rpc concurrency': config.CONCURRENCY_RPC,
        'ledgers per second': Number(stats.ledgersPerSecond.toFixed(2)),
        'transactions per second': Number(stats.txPerSecond.toFixed(1)),
        'cluster threshold tx_bad_seq, tx_insufficient_fee': 20,
        'cluster threshold other codes': 10,
      },
      notes: [
        ...ctx.notes,
        'Result codes are decoded from result_xdr and named exactly as Horizon names them.',
        'Transaction-level codes such as tx_bad_seq are rejected at submission and never reach ledger history, so their clusters are expected to be empty.',
        'byCode counts each code once per failed transaction.',
      ],
    },
  });
  return { run, findings: findings.length };
};
