import { Keypair, StrKey, xdr } from '@stellar/stellar-sdk';
import { formatStroops } from '../../core/amount';
import { appError, err, ok, type Result } from '../../schema';
import type { HorizonAccount, HorizonPort, RpcPort } from '../ports';

type AccountEntry = xdr.AccountEntry;
type Bytes = { value: Uint8Array };

const AUTH_REQUIRED = 1;
const AUTH_REVOCABLE = 2;
const AUTH_IMMUTABLE = 4;
const AUTH_CLAWBACK = 8;

export const accountLedgerKey = (accountId: string): string =>
  xdr.LedgerKey.account(
    new xdr.LedgerKeyAccount({ accountId: Keypair.fromPublicKey(accountId).xdrAccountId() }),
  ).toXdr('base64');

const raw = (bytes: Bytes): Buffer => Buffer.from(bytes.value);

const encodeSigner = (key: xdr.SignerKey): { key: string; type: string } | null => {
  switch (key.type) {
    case 'signerKeyTypeEd25519':
      return { key: StrKey.encodeEd25519PublicKey(raw(key.ed25519)), type: 'ed25519_public_key' };
    case 'signerKeyTypePreAuthTx':
      return { key: StrKey.encodePreAuthTx(raw(key.preAuthTx)), type: 'preauth_tx' };
    case 'signerKeyTypeHashX':
      return { key: StrKey.encodeSha256Hash(raw(key.hashX)), type: 'sha256_hash' };
    default:
      return null;
  }
};

const extensionV1 = (entry: AccountEntry) => (entry.ext.type === 'v1' ? entry.ext.v1 : null);

const sponsorship = (entry: AccountEntry) => {
  const v1 = extensionV1(entry);
  const v2 = v1?.ext.type === 'v2' ? v1.ext.v2 : null;
  return { numSponsored: v2?.numSponsored ?? 0, numSponsoring: v2?.numSponsoring ?? 0 };
};

export const toHorizonAccount = (accountId: string, entry: AccountEntry): HorizonAccount => {
  const [master = 0, low = 0, med = 0, high = 0] = entry.thresholds.value;
  const liabilities = extensionV1(entry)?.liabilities;
  const { numSponsored, numSponsoring } = sponsorship(entry);
  const homeDomain = String(entry.homeDomain);
  const signers = entry.signers.flatMap((signer) => {
    const encoded = encodeSigner(signer.key);
    return encoded ? [{ ...encoded, weight: signer.weight }] : [];
  });
  return {
    id: accountId,
    sequence: entry.seqNum.toString(),
    ...(homeDomain ? { home_domain: homeDomain } : {}),
    subentry_count: entry.numSubEntries,
    num_sponsoring: numSponsoring,
    num_sponsored: numSponsored,
    thresholds: { low_threshold: low, med_threshold: med, high_threshold: high },
    flags: {
      auth_required: (entry.flags & AUTH_REQUIRED) !== 0,
      auth_revocable: (entry.flags & AUTH_REVOCABLE) !== 0,
      auth_immutable: (entry.flags & AUTH_IMMUTABLE) !== 0,
      auth_clawback_enabled: (entry.flags & AUTH_CLAWBACK) !== 0,
    },
    signers: [
      ...signers,
      ...(master > 0 ? [{ key: accountId, weight: master, type: 'ed25519_public_key' }] : []),
    ],
    balances: [
      {
        asset_type: 'native',
        balance: formatStroops(entry.balance),
        buying_liabilities: formatStroops(liabilities?.buying ?? 0n),
        selling_liabilities: formatStroops(liabilities?.selling ?? 0n),
      },
    ],
  };
};

export const decodeAccountEntry = (accountId: string, entryXdr: string): HorizonAccount | null => {
  const data = xdr.LedgerEntryData.fromXdr(entryXdr, 'base64');
  return data.type === 'account' ? toHorizonAccount(accountId, data.account) : null;
};

export const readAccountFromRpc = async (
  rpc: Pick<RpcPort, 'getLedgerEntries'>,
  accountId: string,
): Promise<Result<HorizonAccount | null>> => {
  if (!StrKey.isValidEd25519PublicKey(accountId)) {
    return err(appError('INVALID_INPUT', `Not an account id: ${accountId}`));
  }
  const key = accountLedgerKey(accountId);
  const result = await rpc.getLedgerEntries([key]);
  if (!result.ok) return result;
  const entry = result.value.entries.find((candidate) => candidate.key === key);
  if (!entry) return ok(null);
  try {
    return ok(decodeAccountEntry(accountId, entry.xdr));
  } catch (error) {
    return err(appError('UPSTREAM_FAILED', `Undecodable account entry: ${String(error)}`));
  }
};

export const accountWithRpcFallback = async (
  horizon: Pick<HorizonPort, 'account'>,
  rpc: Pick<RpcPort, 'getLedgerEntries'>,
  accountId: string,
): Promise<Result<HorizonAccount | null>> => {
  const primary = await horizon.account(accountId);
  if (primary.ok) return primary;
  const fallback = await readAccountFromRpc(rpc, accountId);
  return fallback.ok ? fallback : primary;
};

export const withRpcAccountFallback = (horizon: HorizonPort, rpc: RpcPort): HorizonPort => ({
  ...horizon,
  account: (accountId) => accountWithRpcFallback(horizon, rpc, accountId),
});
