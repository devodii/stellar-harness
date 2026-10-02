import { appError, err, ok, type Result } from '@harness/schema';
import type { xdr } from '@stellar/stellar-sdk';
import { fetchExpertContract } from './expert';
import {
  contractCodeKey,
  contractInstanceKey,
  encodeLedgerKey,
  parseInstanceExecutable,
} from './keys';
import type { Fetcher, LedgerEntryResult, RpcPort } from './ports';
import type { ContractExecutableKind, ExpertContract } from './schemas';

export type ContractLookupDeps = { rpc: RpcPort; fetch: Fetcher; stellarExpertUrl: string };

export type ContractLookup = {
  contractId: string;
  latestLedger: number;
  executable: ContractExecutableKind;
  wasmHash: string | null;
  instanceKey: xdr.LedgerKey;
  instanceEntry: LedgerEntryResult | undefined;
  codeKey: xdr.LedgerKey | null;
  codeEntry: LedgerEntryResult | undefined;
  expert: ExpertContract | null;
};

const readEntry = async (
  rpc: RpcPort,
  key: xdr.LedgerKey,
): Promise<Result<{ entry: LedgerEntryResult | undefined; latestLedger: number }>> => {
  const encoded = encodeLedgerKey(key);
  const response = await rpc.getLedgerEntries([encoded]);
  if (!response.ok) return response;
  const entry = response.value.entries.find((candidate) => candidate.key === encoded);
  return ok({ entry, latestLedger: response.value.latestLedger });
};

export const lookupContract = async (
  deps: ContractLookupDeps,
  contractId: string,
  options: { withExpert: boolean },
): Promise<Result<ContractLookup>> => {
  const instanceKey = contractInstanceKey(contractId);
  const instance = await readEntry(deps.rpc, instanceKey);
  if (!instance.ok) return instance;
  const parsed = instance.value.entry ? parseInstanceExecutable(instance.value.entry.xdr) : null;

  let expert: ExpertContract | null = null;
  if (options.withExpert || !parsed) {
    const fetched = await fetchExpertContract(deps.fetch, deps.stellarExpertUrl, contractId);
    expert = fetched.ok ? fetched.value : null;
  }
  if (!instance.value.entry && !expert) {
    return err(appError('NOT_FOUND', `Contract ${contractId} was not found on mainnet`));
  }

  const wasmHash = parsed?.kind === 'wasm' ? parsed.wasmHash : (expert?.wasm ?? null);
  const executable: ContractExecutableKind = parsed?.kind ?? (wasmHash ? 'wasm' : 'unknown');
  const codeKey = wasmHash ? contractCodeKey(wasmHash) : null;
  let codeEntry: LedgerEntryResult | undefined;
  let latestLedger = instance.value.latestLedger;
  if (codeKey) {
    const code = await readEntry(deps.rpc, codeKey);
    if (!code.ok) return code;
    codeEntry = code.value.entry;
    latestLedger = Math.max(latestLedger, code.value.latestLedger);
  }

  return ok({
    contractId,
    latestLedger,
    executable,
    wasmHash,
    instanceKey,
    instanceEntry: instance.value.entry,
    codeKey,
    codeEntry,
    expert,
  });
};

export const footprintKeys = (lookup: ContractLookup): xdr.LedgerKey[] =>
  lookup.codeKey ? [lookup.instanceKey, lookup.codeKey] : [lookup.instanceKey];
