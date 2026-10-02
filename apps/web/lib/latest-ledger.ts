import type { LatestLedger } from './horizon';

export const LEDGER_SOURCES = ['horizon', 'rpc'] as const;
export type LedgerSource = (typeof LEDGER_SOURCES)[number];

export interface LedgerReading extends LatestLedger {
  source: LedgerSource;
}

export type LedgerReaders = Record<LedgerSource, () => Promise<LatestLedger>>;

export const readLatestLedger = async (
  readers: LedgerReaders,
  onFailure: (source: LedgerSource, error: unknown) => void = () => {},
): Promise<LedgerReading | null> => {
  for (const source of LEDGER_SOURCES) {
    try {
      return { ...(await readers[source]()), source };
    } catch (error) {
      onFailure(source, error);
    }
  }
  return null;
};
