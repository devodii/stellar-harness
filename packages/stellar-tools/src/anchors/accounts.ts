import { StrKey } from '@stellar/stellar-sdk';
import type { HorizonAccount, HorizonPort } from './ports';
import { describeError } from './request';
import type { AccountCheck, AnchorToml, StageRecord } from './schemas';
import { SKIP_REASONS, skippedStage, stageRecord, startTimer } from './stage';

type Target = Pick<AccountCheck, 'id' | 'roles' | 'codes'>;

export const accountTargets = (toml: AnchorToml): Target[] => {
  const targets = new Map<string, Target>();
  const upsert = (id: string, role: 'account' | 'issuer', code?: string) => {
    const target = targets.get(id) ?? { id, roles: [], codes: [] };
    if (!target.roles.includes(role)) target.roles.push(role);
    if (code && !target.codes.includes(code)) target.codes.push(code);
    targets.set(id, target);
  };
  for (const id of toml.accounts) upsert(id, 'account');
  for (const { code, issuer } of toml.currencies) if (issuer) upsert(issuer, 'issuer', code);
  return [...targets.values()];
};

const blank = (target: Target, error: string | null): AccountCheck => ({
  ...target,
  found: false,
  homeDomain: null,
  flags: null,
  thresholds: null,
  signers: null,
  balances: null,
  error,
});

const fromHorizon = (target: Target, account: HorizonAccount): AccountCheck => ({
  ...target,
  found: true,
  homeDomain: account.home_domain?.trim().toLowerCase() || null,
  flags: account.flags,
  thresholds: account.thresholds,
  signers: account.signers.length,
  balances: account.balances.length,
  error: null,
});

const checkAccount = async (target: Target, horizon: HorizonPort): Promise<AccountCheck> => {
  if (!StrKey.isValidEd25519PublicKey(target.id)) return blank(target, 'invalid_account_id');
  const result = await horizon.account(target.id);
  if (!result.ok) return blank(target, describeError(result.error));
  return result.value ? fromHorizon(target, result.value) : blank(target, 'not_found');
};

export const homeDomainMismatches = (domain: string, accounts: AccountCheck[]): AccountCheck[] =>
  accounts.filter((a) => a.homeDomain !== null && a.homeDomain !== domain);

export type AccountsOutcome = { record: StageRecord; accounts: AccountCheck[] };

export const probeAccounts = async (
  domain: string,
  toml: AnchorToml,
  horizon: HorizonPort,
): Promise<AccountsOutcome> => {
  const targets = accountTargets(toml);
  if (targets.length === 0) {
    return { record: skippedStage('accounts', SKIP_REASONS.noAccounts), accounts: [] };
  }
  const elapsed = startTimer();
  const accounts = await Promise.all(targets.map((target) => checkAccount(target, horizon)));
  const problems = [
    ...accounts.filter((a) => a.error !== null).map((a) => `${a.id}: ${a.error}`),
    ...homeDomainMismatches(domain, accounts).map(
      (a) => `${a.id}: home_domain ${a.homeDomain} != ${domain}`,
    ),
  ];
  const error = problems.length > 0 ? problems.join('; ') : null;
  return {
    record: stageRecord('accounts', problems.length === 0, null, elapsed(), error),
    accounts,
  };
};
