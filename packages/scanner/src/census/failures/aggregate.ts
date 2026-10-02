import { isPreventableCode } from '../../schema';
import type { FailedTx, FailedTxCodes, LedgerTotal } from './rows';

const SUCCESS_CODES = new Set(['op_success', 'tx_success']);

export const failureCodes = (codes: FailedTxCodes): string[] => {
  const all = [codes.tx];
  if (codes.tx === 'tx_failed') {
    for (const op of codes.ops) if (!SUCCESS_CODES.has(op)) all.push(op);
  }
  return [...new Set(all)];
};

export const isPreventableFailure = (codes: FailedTxCodes): boolean =>
  failureCodes(codes).some(isPreventableCode);

export type LedgerSeriesPoint = LedgerTotal & { preventableCount: number };

export type FailureAggregate = {
  ledgersScanned: number;
  txScanned: number;
  txFailed: number;
  failedRows: number;
  byCode: Record<string, number>;
  preventable: { total: number; byCode: Record<string, number> };
  other: { total: number };
};

const increment = (record: Record<string, number>, key: string) => {
  record[key] = (record[key] ?? 0) + 1;
};

export class FailureAggregator {
  private readonly ledgers = new Map<number, LedgerSeriesPoint>();
  private readonly byCode: Record<string, number> = {};
  private readonly preventableByCode: Record<string, number> = {};
  private preventableTotal = 0;
  private failedRows = 0;

  private point(ledger: number): LedgerSeriesPoint {
    const existing = this.ledgers.get(ledger);
    if (existing) return existing;
    const created = { ledger, txCount: 0, failedCount: 0, preventableCount: 0 };
    this.ledgers.set(ledger, created);
    return created;
  }

  addLedgerTotals(rows: Iterable<LedgerTotal>): void {
    for (const row of rows) {
      const point = this.point(row.ledger);
      point.txCount = row.txCount;
      point.failedCount = row.failedCount;
    }
  }

  addFailed(rows: Iterable<FailedTx>): void {
    for (const row of rows) {
      this.failedRows += 1;
      const codes = failureCodes(row.resultCodes);
      for (const code of codes) increment(this.byCode, code);
      const preventable = codes.filter(isPreventableCode);
      for (const code of preventable) increment(this.preventableByCode, code);
      if (preventable.length > 0) {
        this.preventableTotal += 1;
        this.point(row.ledger).preventableCount += 1;
      }
    }
  }

  series(): LedgerSeriesPoint[] {
    return [...this.ledgers.values()].sort((a, b) => a.ledger - b.ledger);
  }

  result(): FailureAggregate {
    let txScanned = 0;
    let txFailed = 0;
    for (const point of this.ledgers.values()) {
      txScanned += point.txCount;
      txFailed += point.failedCount;
    }
    return {
      ledgersScanned: this.ledgers.size,
      txScanned,
      txFailed,
      failedRows: this.failedRows,
      byCode: { ...this.byCode },
      preventable: { total: this.preventableTotal, byCode: { ...this.preventableByCode } },
      other: { total: this.failedRows - this.preventableTotal },
    };
  }
}
