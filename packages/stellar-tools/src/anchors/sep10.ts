import { FeeBumpTransaction, Keypair, TransactionBuilder } from '@stellar/stellar-sdk';
import type { Fetcher } from './ports';
import { getJson, isRecord, toEndpointProbe } from './request';
import type { AnchorToml, ChallengeChecks, Sep10Probe, StageRecord } from './schemas';
import { SKIP_REASONS, skippedStage, stageRecord } from './stage';
import { MAINNET_PASSPHRASE } from './toml';

export const randomClientAccount = (): string => Keypair.random().publicKey();

type ChallengeExpectation = { signingKey: string | null; domain: string };

const NO_CHECKS: Omit<ChallengeChecks, 'mainnetPassphrase'> = {
  sourceIsSigningKey: false,
  firstOpManageData: false,
  homeDomainMatches: false,
  timeboundsPresent: false,
};

export const verifyChallenge = (
  transactionXdr: string,
  { signingKey, domain }: ChallengeExpectation,
): { checks: Omit<ChallengeChecks, 'mainnetPassphrase'>; error: string | null } => {
  try {
    const tx = TransactionBuilder.fromXDR(transactionXdr, MAINNET_PASSPHRASE);
    if (tx instanceof FeeBumpTransaction) return { checks: NO_CHECKS, error: 'fee_bump_challenge' };
    const first = tx.operations[0];
    const isManageData = first?.type === 'manageData';
    return {
      checks: {
        sourceIsSigningKey: signingKey !== null && tx.source === signingKey,
        firstOpManageData: isManageData,
        homeDomainMatches: isManageData && first.name === `${domain} auth`,
        timeboundsPresent: tx.timeBounds !== undefined,
      },
      error: null,
    };
  } catch (error) {
    return {
      checks: NO_CHECKS,
      error: `undecodable_challenge: ${error instanceof Error ? error.message : 'unknown'}`,
    };
  }
};

const challengeUrl = (endpoint: string, account: string): string | null => {
  try {
    const url = new URL(endpoint);
    url.searchParams.set('account', account);
    return url.toString();
  } catch {
    return null;
  }
};

const failedChecks = (checks: ChallengeChecks): string[] =>
  Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

export type Sep10Outcome = { record: StageRecord; probe: Sep10Probe | null };

export const probeSep10 = async (
  domain: string,
  toml: AnchorToml,
  fetch: Fetcher,
): Promise<Sep10Outcome> => {
  const endpoint = toml.webAuthEndpoint;
  if (!endpoint) return { record: skippedStage('sep10', SKIP_REASONS.notApplicable), probe: null };
  const url = challengeUrl(endpoint, randomClientAccount());
  if (!url) {
    const probe: Sep10Probe = {
      url: endpoint,
      ok: false,
      status: null,
      ms: 0,
      error: 'invalid_url',
      clientDomainRequired: false,
      networkPassphrase: null,
      checks: null,
    };
    return { record: stageRecord('sep10', false, null, 0, 'invalid_url'), probe };
  }
  const response = await getJson(fetch, url);
  const base = { ...toEndpointProbe(response), url: endpoint };
  const body = response.response?.body ?? '';
  if (response.status === 400 && /client_domain/i.test(body)) {
    const note = 'client_domain_required: challenge not decoded';
    return {
      record: stageRecord('sep10', true, 400, base.ms, note),
      probe: {
        ...base,
        ok: true,
        error: note,
        clientDomainRequired: true,
        networkPassphrase: null,
        checks: null,
      },
    };
  }
  const json = isRecord(response.json) ? response.json : {};
  const transaction = typeof json.transaction === 'string' ? json.transaction : null;
  const networkPassphrase =
    typeof json.network_passphrase === 'string' ? json.network_passphrase : null;
  const fail = (error: string, checks: ChallengeChecks | null = null): Sep10Outcome => ({
    record: stageRecord('sep10', false, base.status, base.ms, error),
    probe: { ...base, ok: false, error, clientDomainRequired: false, networkPassphrase, checks },
  });
  if (!response.ok) return fail(response.error ?? 'request_failed');
  if (!transaction) return fail('missing_transaction');
  const verified = verifyChallenge(transaction, { signingKey: toml.signingKey, domain });
  const checks = {
    mainnetPassphrase: networkPassphrase === MAINNET_PASSPHRASE,
    ...verified.checks,
  };
  if (verified.error) return fail(verified.error, checks);
  const failed = failedChecks(checks);
  if (failed.length > 0) return fail(`challenge_checks_failed: ${failed.join(', ')}`, checks);
  return {
    record: stageRecord('sep10', true, base.status, base.ms),
    probe: {
      ...base,
      ok: true,
      error: null,
      clientDomainRequired: false,
      networkPassphrase,
      checks,
    },
  };
};
