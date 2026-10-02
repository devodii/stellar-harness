import { Address, xdr } from '@stellar/stellar-sdk';

export const contractInstanceKey = (contractId: string): xdr.LedgerKey =>
  xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: Address.fromString(contractId).toScAddress(),
      key: xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: xdr.ContractDataDurability.persistent,
    }),
  );

export const contractCodeKey = (wasmHashHex: string): xdr.LedgerKey =>
  xdr.LedgerKey.contractCode(
    new xdr.LedgerKeyContractCode({ hash: Buffer.from(wasmHashHex, 'hex') }),
  );

export const encodeLedgerKey = (key: xdr.LedgerKey): string => key.toXdr('base64');

export const decodeLedgerKey = (base64: string): xdr.LedgerKey =>
  xdr.LedgerKey.fromXdr(base64, 'base64');

export const instanceKeyXdr = (contractId: string): string =>
  encodeLedgerKey(contractInstanceKey(contractId));

export const codeKeyXdr = (wasmHashHex: string): string =>
  encodeLedgerKey(contractCodeKey(wasmHashHex));

export type ContractExecutableInfo =
  { kind: 'wasm'; wasmHash: string } | { kind: 'stellar_asset' } | { kind: 'external' };

export const parseInstanceExecutable = (entryDataXdr: string): ContractExecutableInfo | null => {
  let data: xdr.LedgerEntryData;
  try {
    data = xdr.LedgerEntryData.fromXdr(entryDataXdr, 'base64');
  } catch {
    return null;
  }
  if (data.type !== 'contractData') return null;
  const val = data.contractData.val;
  if (val.type !== 'scvContractInstance') return null;
  const executable = val.instance.executable;
  switch (executable.type) {
    case 'contractExecutableWasm':
      return { kind: 'wasm', wasmHash: Buffer.from(executable.wasmHash.value).toString('hex') };
    case 'contractExecutableStellarAsset':
      return { kind: 'stellar_asset' };
    default:
      return { kind: 'external' };
  }
};

export const wasmHashFromInstanceEntry = (entryDataXdr: string): string | null => {
  const executable = parseInstanceExecutable(entryDataXdr);
  return executable?.kind === 'wasm' ? executable.wasmHash : null;
};
