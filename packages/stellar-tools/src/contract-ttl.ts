import { Address, xdr } from '@stellar/stellar-sdk';
import { type Clients, SECONDS_PER_LEDGER } from './clients';

export type EntryTtl = { liveUntilLedger: number | null; daysLeft: number; archived: boolean };

export type ContractTtl = {
  contractId: string;
  latestLedger: number;
  wasmHash: string | null;
  instance: EntryTtl;
  code: EntryTtl | null;
};

export const instanceKey = (contractId: string): xdr.LedgerKey =>
  xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: Address.fromString(contractId).toScAddress(),
      key: xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: xdr.ContractDataDurability.persistent,
    }),
  );

export const codeKey = (wasmHash: string): xdr.LedgerKey =>
  xdr.LedgerKey.contractCode(new xdr.LedgerKeyContractCode({ hash: Buffer.from(wasmHash, 'hex') }));

export const ttlOf = (liveUntilLedger: number | undefined, latestLedger: number): EntryTtl => {
  if (liveUntilLedger === undefined || liveUntilLedger < latestLedger) {
    return { liveUntilLedger: liveUntilLedger ?? null, daysLeft: 0, archived: true };
  }
  const days = ((liveUntilLedger - latestLedger) * SECONDS_PER_LEDGER) / 86_400;
  return { liveUntilLedger, daysLeft: Math.floor(days * 10) / 10, archived: false };
};

const wasmHashOf = (data: xdr.LedgerEntryData): string | null => {
  if (data.type !== 'contractData' || data.contractData.val.type !== 'scvContractInstance') {
    return null;
  }
  const executable = data.contractData.val.instance.executable;
  return executable.type === 'contractExecutableWasm'
    ? Buffer.from(executable.wasmHash.value).toString('hex')
    : null;
};

export const getContractTtl = async (
  clients: Clients,
  contractId: string,
): Promise<ContractTtl> => {
  const instance = await clients.rpc.getLedgerEntries(instanceKey(contractId));
  const instanceEntry = instance.entries[0];
  const wasmHash = instanceEntry ? wasmHashOf(instanceEntry.val) : null;
  const code = wasmHash ? await clients.rpc.getLedgerEntries(codeKey(wasmHash)) : null;
  return {
    contractId,
    latestLedger: instance.latestLedger,
    wasmHash,
    instance: ttlOf(instanceEntry?.liveUntilLedgerSeq, instance.latestLedger),
    code: code ? ttlOf(code.entries[0]?.liveUntilLedgerSeq, code.latestLedger) : null,
  };
};
