import {
  type AppError,
  NETWORK_PROFILES,
  RentSummary,
  type Snapshot,
  toAppError,
} from '@harness/schema';
import {
  contractCodeKey,
  contractInstanceKey,
  fetchSimulationSource,
  ledgersForDays,
  RENT_HORIZON_DAYS,
  simulateFootprint,
  simulationSourceFor,
  stroopsToXlm,
} from '@harness/stellar-tools/contracts';
import type {
  Emit,
  Fetcher,
  FindingDraft,
  HorizonPort,
  RpcPort,
  Run,
  WriteDerived,
} from './contracts/ports';
import { scfTags } from './contracts/scf';
import type { ContractRow } from './contracts/schemas';
import { fetchXlmUsd, UNAVAILABLE_PRICE, type XlmUsd } from './price';
import { type SampleMethod, selectRentSample } from './rent-sample';

export const RENT_DERIVED = 'rent';
export const RENT_TOP_LIMIT = 100;
export const RENT_TOP_FILE = 'rent_top100.csv';
export const RENT_TOP_COLUMNS = [
  'contract',
  'wasm',
  'family_size',
  'invocations',
  'days_left',
  'xlm12m',
  'usd12m',
  'scf_slug',
] as const;

export type RentRow = { contract: string; extendToLedgers: number; minResourceFeeStroops: number };
export type RentTopRow = Record<(typeof RENT_TOP_COLUMNS)[number], string | number | null>;

export type RentDeps = {
  rpc: RpcPort;
  horizon: HorizonPort;
  fetch: Fetcher;
  run: Run;
  emit: Emit;
  writeDerived: WriteDerived;
  snapshot: Snapshot;
  simulationSource?: string;
  priceUrl?: string;
  rpcConcurrency?: number;
};

export type RentResult = {
  rows: RentRow[];
  method: SampleMethod;
  summary: RentSummary;
  top: RentTopRow[];
  stats: { liveInstances: number; sampled: number; simulated: number; failed: number };
  gaps: { source: string; error: AppError }[];
};

const roundXlm = (value: number) => Math.round(value * 1e7) / 1e7;

export const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] as number)
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
};

export const toUsd = (xlm: number, xlmUsd: XlmUsd): number | null =>
  xlmUsd.price > 0 ? Math.round(xlm * xlmUsd.price * 100) / 100 : null;

export const xlm12m = (row: RentRow): number => stroopsToXlm(row.minResourceFeeStroops);

export const rentSummary = (
  rows: RentRow[],
  contracts: Map<string, ContractRow>,
  xlmUsd: XlmUsd,
): RentSummary => {
  const costs = rows.map(xlm12m);
  const funded = rows.filter((row) => contracts.get(row.contract)?.scf);
  return RentSummary.parse({
    contractsEstimated: rows.length,
    totalXlm12m: roundXlm(costs.reduce((sum, cost) => sum + cost, 0)),
    medianXlm12m: roundXlm(median(costs)),
    scfFundedXlm12m: roundXlm(funded.reduce((sum, row) => sum + xlm12m(row), 0)),
    xlmUsd,
  });
};

export const rentTopRows = (
  rows: RentRow[],
  contracts: Map<string, ContractRow>,
  xlmUsd: XlmUsd,
  limit: number = RENT_TOP_LIMIT,
): RentTopRow[] =>
  [...rows]
    .sort(
      (a, b) =>
        b.minResourceFeeStroops - a.minResourceFeeStroops || a.contract.localeCompare(b.contract),
    )
    .slice(0, limit)
    .map((row) => {
      const contract = contracts.get(row.contract);
      const xlm = xlm12m(row);
      return {
        contract: row.contract,
        wasm: contract?.wasm ?? null,
        family_size: contract?.familySize ?? null,
        invocations: contract?.invocations ?? null,
        days_left: contract?.instance?.daysLeft ?? null,
        xlm12m: xlm,
        usd12m: toUsd(xlm, xlmUsd),
        scf_slug: contract?.scf?.slug ?? null,
      };
    });

const rentFinding = (
  contract: ContractRow,
  row: RentRow,
  restorePreambleStroops: number | null,
  xlmUsd: XlmUsd,
  snapshotLedger: number,
): FindingDraft => {
  const xlm = xlm12m(row);
  return {
    type: 'CONTRACT_RENT_12M',
    subjectKind: 'contract',
    subject: row.contract,
    severity: 'info',
    evidence: {
      xlm12m: xlm,
      usd12m: toUsd(xlm, xlmUsd),
      minResourceFeeStroops: row.minResourceFeeStroops,
      extendToLedgers: row.extendToLedgers,
      days: RENT_HORIZON_DAYS,
      restorePreambleStroops,
      wasm: contract.wasm,
      snapshotLedger,
    },
    tags: ['contract', 'rent', ...scfTags(contract.scf)],
  };
};

export const runRentCensus = async (
  deps: RentDeps,
  contracts: ContractRow[],
): Promise<RentResult> => {
  const gaps: RentResult['gaps'] = [];
  const live = contracts.filter((row) => row.instance && !row.instance.archived);
  const { sample, method } = selectRentSample(live);
  const byContract = new Map(contracts.map((row) => [row.contract, row]));
  const extendToLedgers = ledgersForDays(RENT_HORIZON_DAYS, deps.snapshot.ledgerCloseSeconds);

  const price = await fetchXlmUsd(deps.fetch, deps.priceUrl);
  if (!price.ok) gaps.push({ source: 'price:xlm_usd', error: price.error });
  const xlmUsd = price.ok ? price.value : UNAVAILABLE_PRICE;

  const network = deps.snapshot.network;
  const source = await fetchSimulationSource(
    deps,
    deps.simulationSource ?? simulationSourceFor(network),
    NETWORK_PROFILES[network].passphrase,
  );
  let simulated: { row: RentRow; restorePreambleStroops: number | null }[] = [];
  let failed = 0;
  if (!source.ok) {
    gaps.push({ source: 'horizon:simulation_source', error: source.error });
  } else {
    const outcome = await deps.run(
      sample,
      async (contract) => {
        const keys = [contractInstanceKey(contract.contract)];
        if (contract.wasm) keys.push(contractCodeKey(contract.wasm));
        const estimate = await simulateFootprint(deps.rpc, source.value, keys, {
          kind: 'extend',
          extendToLedgers,
        });
        if (!estimate.ok) throw estimate.error;
        return {
          row: {
            contract: contract.contract,
            extendToLedgers,
            minResourceFeeStroops: estimate.value.minResourceFeeStroops,
          },
          restorePreambleStroops: estimate.value.restorePreamble?.minResourceFeeStroops ?? null,
        };
      },
      { concurrency: deps.rpcConcurrency ?? 8, label: 'rent:simulate' },
    );
    simulated = outcome.results;
    failed = outcome.failures.length;
    if (failed > 0) {
      gaps.push({
        source: 'rpc:simulateTransaction',
        error: { ...toAppError(outcome.failures[0]?.error), meta: { failed } },
      });
    }
  }

  const rows = simulated.map((item) => item.row);
  await deps.writeDerived(RENT_DERIVED, rows);
  for (const item of simulated) {
    const contract = byContract.get(item.row.contract);
    if (!contract) continue;
    await deps.emit(
      rentFinding(
        contract,
        item.row,
        item.restorePreambleStroops,
        xlmUsd,
        deps.snapshot.snapshotLedger,
      ),
    );
  }

  return {
    rows,
    method,
    summary: rentSummary(rows, byContract, xlmUsd),
    top: rentTopRows(rows, byContract, xlmUsd),
    stats: { liveInstances: live.length, sampled: sample.length, simulated: rows.length, failed },
    gaps,
  };
};
