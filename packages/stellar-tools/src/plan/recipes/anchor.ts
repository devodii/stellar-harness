import type { Finding, FindingType } from '@harness/schema';
import { evidenceString } from '../evidence';
import { handoff, type Recipe, read, type StepDraft } from '../step';

type AnchorFindingType = Extract<FindingType, `ANCHOR_${string}`>;

const probe = (finding: Finding): StepDraft =>
  read('probeAnchor', 'Re-run the conformance probe to confirm the current state.', {
    domain: finding.subject,
    runAnchorTests: finding.type === 'ANCHOR_TESTS_FAILED',
  });

const accountReads = (finding: Finding): StepDraft[] => {
  const address = evidenceString(finding.evidence, 'account', 'issuer', 'accounts', 'issuers');
  if (!address) return [];
  return [
    read('getAccount', 'Read the listed account: home_domain, flags, thresholds and signers.', {
      address,
    }),
  ];
};

const anchorRecipe =
  (title: string, summary: (domain: string) => string): Recipe =>
  (finding) => ({
    title: `${title} on ${finding.subject}`,
    steps: [probe(finding), ...accountReads(finding)],
    handoff: handoff('anchor_operator', summary(finding.subject)),
  });

export const ANCHOR_RECIPES = {
  ANCHOR_TOML_UNREACHABLE: anchorRecipe(
    'Restore stellar.toml',
    (domain) =>
      `The anchor operator serves stellar.toml at https://${domain}/.well-known/stellar.toml over valid TLS.`,
  ),
  ANCHOR_TOML_MISSING_SIGNING_KEY: anchorRecipe(
    'Publish SIGNING_KEY',
    () =>
      'The anchor operator adds SIGNING_KEY to stellar.toml so SEP-10 challenges can be verified.',
  ),
  ANCHOR_TOML_NO_ACCOUNTS: anchorRecipe(
    'List accounts and issuers',
    () => 'The anchor operator lists its ACCOUNTS and every CURRENCIES issuer in stellar.toml.',
  ),
  ANCHOR_HOME_DOMAIN_MISMATCH: anchorRecipe(
    'Align home_domain',
    (domain) =>
      `The anchor operator sets home_domain to ${domain} on each listed account with set_options signed by that account.`,
  ),
  ANCHOR_ISSUER_FLAGS: anchorRecipe(
    'Review issuer flags',
    () =>
      'The anchor operator sets issuer flags (auth required, revocable, clawback) to match the asset terms in stellar.toml.',
  ),
  ANCHOR_NO_SEP_ENDPOINTS: anchorRecipe(
    'Publish SEP endpoints',
    () =>
      'The anchor operator lists the SEP endpoints it runs (WEB_AUTH_ENDPOINT, TRANSFER_SERVER_SEP0024, ANCHOR_QUOTE_SERVER, DIRECT_PAYMENT_SERVER) in stellar.toml.',
  ),
  ANCHOR_INFO_UNREADABLE: anchorRecipe(
    'Fix /info',
    () => 'The anchor operator makes the transfer server /info endpoint return valid JSON.',
  ),
  ANCHOR_SEP10_CHALLENGE_FAILS: anchorRecipe(
    'Fix the SEP-10 challenge',
    () =>
      'The anchor operator fixes WEB_AUTH_ENDPOINT so it returns a challenge signed by the SIGNING_KEY in stellar.toml.',
  ),
  ANCHOR_SEP38_PRICES_FAILS: anchorRecipe(
    'Fix SEP-38 /info',
    () => 'The anchor operator makes the SEP-38 quote server /info return the assets it prices.',
  ),
  ANCHOR_SEP31_INFO_FAILS: anchorRecipe(
    'Fix SEP-31 /info',
    () =>
      'The anchor operator makes the SEP-31 direct payment server /info return the assets it receives.',
  ),
  ANCHOR_TESTS_FAILED: anchorRecipe(
    'Fix failing anchor tests',
    () =>
      'The anchor operator fixes the failing stellar-anchor-tests cases for each SEP it supports and reruns the suite.',
  ),
  ANCHOR_TLS_OR_CORS_BROKEN: anchorRecipe(
    'Fix TLS and CORS',
    () =>
      'The anchor operator serves stellar.toml and /info over valid TLS with Access-Control-Allow-Origin: *.',
  ),
} satisfies Record<AnchorFindingType, Recipe>;
