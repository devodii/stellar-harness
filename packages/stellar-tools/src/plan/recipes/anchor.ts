import type { Finding, FindingType } from '@harness/schema';
import { evidenceString } from '../evidence';
import { notice, type Recipe, read, type StepDraft } from '../step';

type AnchorFindingType = Extract<FindingType, `ANCHOR_${string}`>;

const probe = (finding: Finding, description: string): StepDraft =>
  read('probeAnchor', description, {
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
  (title: string, problem: string): Recipe =>
  (finding) => ({
    title: `${title} on ${finding.subject}`,
    steps: [
      probe(finding, 'Re-run the conformance probe to confirm the current state.'),
      ...accountReads(finding),
      notice(`Draft a notice to the anchor operator: ${problem}`, {
        domain: finding.subject,
        findingType: finding.type,
        fix: finding.suggestedAction,
      }),
      probe(finding, 'Re-run the probe after the operator reports a fix to verify it.'),
    ],
  });

export const ANCHOR_RECIPES = {
  ANCHOR_TOML_UNREACHABLE: anchorRecipe(
    'Restore stellar.toml',
    'stellar.toml is not served at /.well-known/stellar.toml.',
  ),
  ANCHOR_TOML_MISSING_SIGNING_KEY: anchorRecipe(
    'Publish SIGNING_KEY',
    'stellar.toml has no SIGNING_KEY, so SEP-10 cannot be verified.',
  ),
  ANCHOR_TOML_NO_ACCOUNTS: anchorRecipe(
    'List accounts and issuers',
    'stellar.toml lists no ACCOUNTS and no CURRENCIES issuers.',
  ),
  ANCHOR_HOME_DOMAIN_MISMATCH: anchorRecipe(
    'Align home_domain',
    'a listed account has a home_domain that does not match the anchor domain.',
  ),
  ANCHOR_ISSUER_FLAGS: anchorRecipe(
    'Review issuer flags',
    'issuer flags should match the asset policy published in stellar.toml.',
  ),
  ANCHOR_NO_SEP_ENDPOINTS: anchorRecipe(
    'Publish SEP endpoints',
    'stellar.toml lists none of the SEP endpoints.',
  ),
  ANCHOR_INFO_UNREADABLE: anchorRecipe(
    'Fix /info',
    'the transfer server /info endpoint does not return readable JSON.',
  ),
  ANCHOR_SEP10_CHALLENGE_FAILS: anchorRecipe(
    'Fix the SEP-10 challenge',
    'the web auth challenge is missing or does not verify against SIGNING_KEY.',
  ),
  ANCHOR_SEP38_PRICES_FAILS: anchorRecipe(
    'Fix SEP-38 /info',
    'the quote server /info endpoint does not return assets.',
  ),
  ANCHOR_SEP31_INFO_FAILS: anchorRecipe(
    'Fix SEP-31 /info',
    'the direct payment server /info endpoint does not return receive assets.',
  ),
  ANCHOR_TESTS_FAILED: anchorRecipe(
    'Fix failing anchor tests',
    'stellar-anchor-tests fail for at least one supported SEP.',
  ),
  ANCHOR_TLS_OR_CORS_BROKEN: anchorRecipe(
    'Fix TLS and CORS',
    'stellar.toml or /info is served without valid TLS or Access-Control-Allow-Origin.',
  ),
} satisfies Record<AnchorFindingType, Recipe>;
