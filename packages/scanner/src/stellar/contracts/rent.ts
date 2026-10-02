import {
  Account,
  Operation,
  SorobanDataBuilder,
  type Transaction,
  TransactionBuilder,
  type xdr,
} from '@stellar/stellar-sdk';
import { appError, err, ok, type Result } from '../../schema';
import { accountWithRpcFallback } from '../core/account-entry';
import { encodeLedgerKey } from './keys';
import type { HorizonPort, RpcPort } from './ports';
import type { Footprint, RentEstimate } from './schemas';

export const INCLUSION_FEE_STROOPS = 100;
export const STROOPS_PER_XLM = 10_000_000;

export type SimulationSource = { accountId: string; sequence: string; networkPassphrase: string };

export type FootprintAction = { kind: 'extend'; extendToLedgers: number } | { kind: 'restore' };

export type FootprintEntries = 'instance' | 'code' | 'both';

const ENTRY_LABELS: Record<FootprintEntries, string> = {
  instance: 'the contract instance',
  code: 'the contract wasm code',
  both: 'the contract instance and its wasm code',
};

export const describeFootprintOperation = (
  action: { kind: 'extend'; days: number } | { kind: 'restore' },
  entries: FootprintEntries,
): string =>
  action.kind === 'extend'
    ? `Extend the TTL of ${ENTRY_LABELS[entries]} to ${action.days} days (ExtendFootprintTTL)`
    : `Restore ${ENTRY_LABELS[entries]} from the archive (RestoreFootprint)`;

export const stroopsToXlm = (stroops: number): number => stroops / STROOPS_PER_XLM;

const footprintFor = (keys: xdr.LedgerKey[], action: FootprintAction): Footprint => {
  const encoded = keys.map(encodeLedgerKey);
  return action.kind === 'extend'
    ? { readOnly: encoded, readWrite: [] }
    : { readOnly: [], readWrite: encoded };
};

export const buildFootprintTransaction = (
  source: SimulationSource,
  keys: xdr.LedgerKey[],
  action: FootprintAction,
): Transaction => {
  const sorobanData =
    action.kind === 'extend'
      ? new SorobanDataBuilder().setReadOnly(keys).build()
      : new SorobanDataBuilder().setReadWrite(keys).build();
  const operation =
    action.kind === 'extend'
      ? Operation.extendFootprintTtl({ extendTo: action.extendToLedgers })
      : Operation.restoreFootprint();
  return new TransactionBuilder(new Account(source.accountId, source.sequence), {
    fee: String(INCLUSION_FEE_STROOPS),
    networkPassphrase: source.networkPassphrase,
    sorobanData,
  })
    .addOperation(operation)
    .setTimeout(0)
    .build();
};

const parseStroops = (value: string | undefined): number | null => {
  if (value === undefined || !/^\d+$/.test(value)) return null;
  return Number(value);
};

export const simulateFootprint = async (
  rpc: RpcPort,
  source: SimulationSource,
  keys: xdr.LedgerKey[],
  action: FootprintAction,
): Promise<Result<RentEstimate>> => {
  const draft = buildFootprintTransaction(source, keys, action);
  const simulated = await rpc.simulateTransaction(draft.toXdr());
  if (!simulated.ok) return simulated;
  const { error, minResourceFee, transactionData, restorePreamble, latestLedger } = simulated.value;
  const minResourceFeeStroops = parseStroops(minResourceFee);
  if (error || minResourceFeeStroops === null || !transactionData) {
    return err(
      appError('UPSTREAM_FAILED', error ?? 'Simulation returned no resource fee', {
        action: action.kind,
      }),
    );
  }
  const preambleFee = parseStroops(restorePreamble?.minResourceFee);
  return ok({
    minResourceFeeStroops,
    estimatedXlm: stroopsToXlm(minResourceFeeStroops + INCLUSION_FEE_STROOPS),
    footprint: footprintFor(keys, action),
    restorePreamble: preambleFee === null ? null : { minResourceFeeStroops: preambleFee },
    latestLedger,
  });
};

export type SimulationSourcePorts = {
  horizon: HorizonPort;
  rpc: Pick<RpcPort, 'getLedgerEntries'>;
};

export const fetchSimulationSource = async (
  { horizon, rpc }: SimulationSourcePorts,
  accountId: string,
  networkPassphrase: string,
): Promise<Result<SimulationSource>> => {
  const account = await accountWithRpcFallback(horizon, rpc, accountId);
  if (!account.ok) return account;
  if (!account.value) {
    return err(appError('NOT_FOUND', `Simulation source account ${accountId} does not exist`));
  }
  return ok({ accountId, sequence: account.value.sequence, networkPassphrase });
};
