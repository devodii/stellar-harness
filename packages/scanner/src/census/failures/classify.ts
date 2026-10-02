import { formatStroops } from '../../core/amount';
import { reserveShortfallStroops } from '../../core/reserve';
import type { AccountActivity } from './clusters';
import type { HorizonAccount, HorizonPort, Runner } from './ports';

export const DEFAULT_CHANNEL_MIN_ACCOUNTS = 5;
const CONTRACT_CALLER_SHARE = 0.5;

export type ClassificationTag =
  'multisig' | 'anchor_distribution' | 'channel_pattern' | 'contract_caller';

export type AccountClassification = {
  account: string;
  exists: boolean;
  tags: ClassificationTag[];
  multisig: boolean;
  homeDomain?: string;
  medThreshold?: number;
  signerCount?: number;
  firstOperationType?: string;
  funder?: string;
  contractCallerShare?: number;
  reserveShortfallXlm?: number;
};

export type ClassificationGap = {
  account: string;
  stage: 'account' | 'first_operation';
  message: string;
};

export const activeSignerCount = (account: HorizonAccount): number =>
  account.signers.filter((signer) => signer.weight > 0).length;

export const isMultisig = (account: HorizonAccount): boolean =>
  account.thresholds.med_threshold > 1 || activeSignerCount(account) > 1;

export const normalizeDomain = (domain: string): string => domain.trim().toLowerCase();

export const isAnchorDistribution = (
  homeDomain: string | undefined,
  anchorDomains: ReadonlySet<string> | undefined,
): boolean =>
  homeDomain !== undefined && (anchorDomains?.has(normalizeDomain(homeDomain)) ?? false);

export const contractCallerShare = (activity: AccountActivity | undefined): number =>
  activity && activity.opCount > 0 ? activity.invokeOps / activity.opCount : 0;

export const channelFunders = (
  funderByAccount: ReadonlyMap<string, string>,
  minAccounts: number,
): Set<string> => {
  const counts = new Map<string, number>();
  for (const funder of funderByAccount.values()) counts.set(funder, (counts.get(funder) ?? 0) + 1);
  return new Set([...counts].filter(([, count]) => count >= minAccounts).map(([funder]) => funder));
};

export type ClassifyInput = {
  accounts: string[];
  horizon: HorizonPort;
  run: Runner;
  concurrency: number;
  activity: (account: string) => AccountActivity | undefined;
  anchorDomains?: ReadonlySet<string>;
  channelMinAccounts?: number;
};

export type ClassifyOutput = {
  byAccount: Map<string, AccountClassification>;
  gaps: ClassificationGap[];
  calls: number;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : typeof error === 'object' && error && 'message' in error
      ? String(error.message)
      : String(error);

export const classifyAccounts = async (input: ClassifyInput): Promise<ClassifyOutput> => {
  const anchorDomains = input.anchorDomains
    ? new Set([...input.anchorDomains].map(normalizeDomain))
    : undefined;
  const byAccount = new Map<string, AccountClassification>();
  const funderByAccount = new Map<string, string>();
  const gaps: ClassificationGap[] = [];
  let calls = 0;

  const classifyOne = async (account: string): Promise<void> => {
    const share = contractCallerShare(input.activity(account));
    const tags: ClassificationTag[] = share > CONTRACT_CALLER_SHARE ? ['contract_caller'] : [];
    const result: AccountClassification = {
      account,
      exists: false,
      tags,
      multisig: false,
      contractCallerShare: share,
    };
    byAccount.set(account, result);

    calls += 1;
    const fetched = await input.horizon.account(account);
    if (!fetched.ok) gaps.push({ account, stage: 'account', message: fetched.error.message });
    else if (fetched.value) {
      const horizonAccount = fetched.value;
      result.exists = true;
      result.homeDomain = horizonAccount.home_domain || undefined;
      result.medThreshold = horizonAccount.thresholds.med_threshold;
      result.signerCount = activeSignerCount(horizonAccount);
      result.multisig = isMultisig(horizonAccount);
      const shortfall = reserveShortfallStroops(horizonAccount);
      if (shortfall > 0n) result.reserveShortfallXlm = Number(formatStroops(shortfall));
      if (result.multisig) tags.push('multisig');
      if (isAnchorDistribution(result.homeDomain, anchorDomains)) tags.push('anchor_distribution');
    }

    calls += 1;
    const first = await input.horizon.firstOperation(account);
    if (!first.ok) gaps.push({ account, stage: 'first_operation', message: first.error.message });
    else if (first.value) {
      result.firstOperationType = first.value.type;
      if (first.value.type === 'create_account' && first.value.funder) {
        result.funder = first.value.funder;
        funderByAccount.set(account, first.value.funder);
      }
    }
  };

  const outcome = await input.run(input.accounts, classifyOne, {
    concurrency: input.concurrency,
    label: 'failures:classify',
  });
  for (const failure of outcome.failures) {
    gaps.push({ account: failure.task, stage: 'account', message: errorMessage(failure.error) });
  }

  const channels = channelFunders(
    funderByAccount,
    input.channelMinAccounts ?? DEFAULT_CHANNEL_MIN_ACCOUNTS,
  );
  for (const [account, funder] of funderByAccount) {
    if (channels.has(funder)) byAccount.get(account)?.tags.push('channel_pattern');
  }

  return { byAccount, gaps, calls };
};
