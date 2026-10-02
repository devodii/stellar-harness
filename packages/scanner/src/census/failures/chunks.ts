import { appError, err, ok, type Result } from '@harness/schema';
import type { RpcPort, RpcTransaction } from './ports';
import type { LedgerTotal } from './rows';

export const DEFAULT_CHUNK_LEDGERS = 100;
export const RPC_PAGE_LIMIT = 200;
const DEFAULT_MAX_CALLS_PER_LEDGER = 50;

export type LedgerChunk = { id: number; start: number; end: number };

export type PlanChunksOptions = {
  chunkLedgers?: number;
  sampleEvery?: number;
};

export const planChunks = (
  startLedger: number,
  endLedger: number,
  options: PlanChunksOptions = {},
): LedgerChunk[] => {
  const size = Math.max(1, options.chunkLedgers ?? DEFAULT_CHUNK_LEDGERS);
  const sampleEvery = Math.max(1, options.sampleEvery ?? 1);
  const chunks: LedgerChunk[] = [];
  for (let start = startLedger, id = 0; start <= endLedger; start += size, id += 1) {
    if (id % sampleEvery !== 0) continue;
    chunks.push({ id, start, end: Math.min(start + size - 1, endLedger) });
  }
  return chunks;
};

export type ChunkScan = {
  chunk: LedgerChunk;
  totals: LedgerTotal[];
  failed: RpcTransaction[];
  calls: number;
  txSeen: number;
};

export type ScanChunkOptions = {
  pageLimit?: number;
  maxCalls?: number;
};

const fillTotals = (
  chunk: LedgerChunk,
  counts: Map<number, { txCount: number; failedCount: number }>,
): LedgerTotal[] => {
  const totals: LedgerTotal[] = [];
  for (let ledger = chunk.start; ledger <= chunk.end; ledger += 1) {
    totals.push({ ledger, ...(counts.get(ledger) ?? { txCount: 0, failedCount: 0 }) });
  }
  return totals;
};

export const scanChunk = async (
  rpc: RpcPort,
  chunk: LedgerChunk,
  options: ScanChunkOptions = {},
): Promise<Result<ChunkScan>> => {
  const limit = options.pageLimit ?? RPC_PAGE_LIMIT;
  const maxCalls = options.maxCalls ?? (chunk.end - chunk.start + 1) * DEFAULT_MAX_CALLS_PER_LEDGER;
  const counts = new Map<number, { txCount: number; failedCount: number }>();
  const failed: RpcTransaction[] = [];
  let cursor: string | undefined;
  let calls = 0;
  let txSeen = 0;

  while (true) {
    if (calls >= maxCalls) {
      return err(appError('UPSTREAM_FAILED', 'Chunk exceeded its call budget', { chunk, calls }));
    }
    const page = await rpc.getTransactions(
      cursor === undefined ? { startLedger: chunk.start, limit } : { cursor, limit },
    );
    calls += 1;
    if (!page.ok) return err({ ...page.error, meta: { ...page.error.meta, chunk, calls } });

    const { transactions, latestLedger } = page.value;
    let passedEnd = false;
    for (const tx of transactions) {
      if (tx.ledger > chunk.end) {
        passedEnd = true;
        break;
      }
      if (tx.ledger < chunk.start) continue;
      const entry = counts.get(tx.ledger) ?? { txCount: 0, failedCount: 0 };
      entry.txCount += 1;
      txSeen += 1;
      if (tx.status === 'FAILED') {
        entry.failedCount += 1;
        failed.push(tx);
      }
      counts.set(tx.ledger, entry);
    }
    if (passedEnd) break;
    if (transactions.length === 0) {
      if (latestLedger >= chunk.end) break;
      return err(
        appError('UPSTREAM_FAILED', 'RPC has not reached the chunk end', { chunk, latestLedger }),
      );
    }
    if (page.value.cursor === cursor) {
      return err(appError('UPSTREAM_FAILED', 'RPC cursor did not advance', { chunk, cursor }));
    }
    cursor = page.value.cursor;
  }

  return ok({ chunk, totals: fillTotals(chunk, counts), failed, calls, txSeen });
};
