import {
  Operation,
  rpc,
  SorobanDataBuilder,
  TransactionBuilder,
  type xdr,
} from '@stellar/stellar-sdk';
import { type Clients, SECONDS_PER_LEDGER, stroopsToXlm } from './clients';
import { codeKey, getContractTtl, instanceKey } from './contract-ttl';

const INCLUSION_FEE_STROOPS = 100;

export type Simulation = {
  contractId: string;
  operation: string;
  minResourceFeeStroops: number;
  estimatedCostXlm: number;
  footprintEntries: number;
  latestLedger: number;
};

type FootprintAction = { kind: 'extend'; days: number } | { kind: 'restore' };

export const MAX_EXTEND_LEDGERS = 3_110_399;
export const MAX_EXTEND_DAYS = 180;

export const ledgersForDays = (days: number): number =>
  Math.min(Math.round((days * 86_400) / SECONDS_PER_LEDGER), MAX_EXTEND_LEDGERS);

const describe = (action: FootprintAction, keys: number): string => {
  const entries = keys > 1 ? 'the contract instance and its wasm code' : 'the contract instance';
  if (action.kind === 'restore') return `Restore ${entries} from the archive (RestoreFootprint)`;
  const days = Math.min(action.days, MAX_EXTEND_DAYS);
  const limit = action.days > MAX_EXTEND_DAYS ? ', the network maximum' : '';
  return `Extend the TTL of ${entries} to ${days} days from now${limit} (ExtendFootprintTTL)`;
};

const simulateFootprint = async (
  clients: Clients,
  contractId: string,
  source: string,
  action: FootprintAction,
): Promise<Simulation> => {
  const ttl = await getContractTtl(clients, contractId);
  const keys: xdr.LedgerKey[] = [instanceKey(contractId)];
  if (ttl.wasmHash) keys.push(codeKey(ttl.wasmHash));
  const sorobanData =
    action.kind === 'extend'
      ? new SorobanDataBuilder().setReadOnly(keys).build()
      : new SorobanDataBuilder().setReadWrite(keys).build();
  const transaction = new TransactionBuilder(await clients.rpc.getAccount(source), {
    fee: String(INCLUSION_FEE_STROOPS),
    networkPassphrase: clients.passphrase,
    sorobanData,
  })
    .addOperation(
      action.kind === 'extend'
        ? Operation.extendFootprintTtl({ extendTo: ledgersForDays(action.days) })
        : Operation.restoreFootprint({}),
    )
    .setTimeout(0)
    .build();
  const result = await clients.rpc.simulateTransaction(transaction);
  if (rpc.Api.isSimulationError(result)) throw new Error(`Simulation failed: ${result.error}`);
  const minResourceFeeStroops = Number(result.minResourceFee);
  return {
    contractId,
    operation: describe(action, keys.length),
    minResourceFeeStroops,
    estimatedCostXlm: stroopsToXlm(minResourceFeeStroops + INCLUSION_FEE_STROOPS),
    footprintEntries: keys.length,
    latestLedger: result.latestLedger,
  };
};

export const simulateExtendTtl = (
  clients: Clients,
  input: { contractId: string; days: number; source: string },
): Promise<Simulation> =>
  simulateFootprint(clients, input.contractId, input.source, { kind: 'extend', days: input.days });

export const simulateRestore = (
  clients: Clients,
  input: { contractId: string; source: string },
): Promise<Simulation> =>
  simulateFootprint(clients, input.contractId, input.source, { kind: 'restore' });
