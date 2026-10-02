import { getTests, runTests } from '@stellar/anchor-tests';
import { DEFAULT_NETWORK, NETWORK_PROFILES } from '../../schema';
import type {
  AnchorSepResult,
  AnchorTestSep,
  AnchorTestsReport,
  ExcludedTest,
} from '../../stellar/anchors';

export type LibConfig = {
  homeDomain: string;
  seps: number[];
  networkPassphrase: string;
  sepConfig?: Record<string, unknown>;
};

export type LibTest = {
  sep: number;
  group: string;
  assertion: string;
  dependencies?: LibTest[] | ((config: LibConfig) => LibTest[]);
};

export type LibRun = {
  test: LibTest;
  result: { failure?: { name: string; message?: string }; skipped?: boolean };
};

export type AnchorTestsLib = {
  getTests(config: LibConfig): Promise<LibTest[]>;
  runTests(tests: LibTest[], config: LibConfig): AsyncIterator<LibRun>;
};

export const anchorTestsLib: AnchorTestsLib = {
  getTests: (config) => getTests(config as never) as unknown as Promise<LibTest[]>,
  runTests: (tests, config) =>
    runTests(tests as never, config as never)[
      Symbol.asyncIterator
    ]() as unknown as AsyncIterator<LibRun>,
};

const key = (sep: number, group: string, assertion: string): string =>
  `${sep}|${group}|${assertion}`;
export const testKey = (test: Pick<LibTest, 'sep' | 'group' | 'assertion'>): string =>
  key(test.sep, test.group, test.assertion);

const tests = (sep: number, group: string, assertions: string[]): string[] =>
  assertions.map((assertion) => key(sep, group, assertion));

export const SAFE_TESTS: ReadonlySet<string> = new Set([
  ...tests(1, 'TOML Tests', [
    'the TOML file exists at ./well-known/stellar.toml',
    'the file has a size less than 100KB',
    'has a valid network passphrase',
    'has a valid CURRENCIES section',
    'all URLs are HTTPS and end without slashes',
  ]),
  ...tests(10, 'TOML Tests', [
    'has a valid WEB_AUTH_ENDPOINT in the TOML file',
    'has valid SIGNING_KEY',
  ]),
  ...tests(10, 'GET /auth', [
    'returns a valid GET /auth response',
    "rejects requests with no 'account' parameter",
    "rejects requests with an invalid 'account' parameter",
  ]),
  ...tests(10, 'POST /auth', [
    'returns a valid JWT',
    'accepts JSON requests',
    "fails with no 'transaction' key in the body",
    'fails if the challenge is not signed by the client',
    "fails if the 'transaction' value is invalid",
    'fails if the challenge is not signed by SIGNING_KEY',
    'fails if a challenge for a nonexistent account has extra client signatures',
  ]),
  ...tests(12, 'TOML Tests', ['has KYC_SERVER attribute']),
  ...tests(12, 'GET /customer', ['requires a SEP-10 JWT', 'has a valid schema for a new customer']),
  ...tests(24, 'TOML Tests', ['has a valid transfer server URL']),
  ...tests(24, '/info', [
    'response is compliant with the schema',
    'configured asset code is enabled for deposit',
    'configured asset code is enabled for withdraw',
  ]),
  ...tests(24, '/transaction', [
    'requires a SEP-10 JWT on /transaction',
    "returns 404 for a nonexistent transaction 'id'",
    "returns 404 for a nonexistent 'external_transaction_id'",
    "returns 404 for a nonexistent 'stellar_transaction_id'",
  ]),
  ...tests(24, '/transactions', [
    'requires a SEP-10 JWT on /transactions',
    'returns an empty list for accounts with no transactions',
    "rejects requests with a bad 'asset_code' parameter",
  ]),
  ...tests(38, 'TOML Tests', ['has an ANCHOR_QUOTE_SERVER attribute']),
  ...tests(38, 'GET /info', ['returns a valid info response']),
  ...tests(38, 'GET /prices', [
    'returns a valid response',
    "allows off-chain assets as 'sell_asset'",
    'specifying delivery method is optional',
  ]),
  ...tests(38, 'GET /price', [
    'returns a valid response with',
    'returned amounts are calculated correctly',
    "accepts the 'buy_amount' parameter with",
    'specifying delivery method is optional with',
  ]),
  ...tests(38, 'GET /quote', [
    'requires SEP-10 authentication',
    'returns a 404 for unknown quote IDs',
  ]),
]);

export const EXCLUDED_SEPS: Partial<Record<number, string>> = {
  6: 'SEP-6 is not in the census SEP list; GET /deposit and /withdraw initiate transactions',
  31: 'the library requires sendingAnchorClientSecret (a configured secret key) and SEP-12 customer PUTs to run SEP-31',
};

const GROUP_REASONS: [RegExp, string][] = [
  [/^PUT \/customer$/, 'writes a customer record (PUT /customer)'],
  [/^DELETE \/customer$/, 'deletes customer records (DELETE /customer)'],
  [/^(GET )?\/(deposit|withdraw)$/, 'initiates a deposit or withdrawal'],
  [/^POST \/quote$/, 'creates a firm quote (POST /quote)'],
  [/^POST \/transactions$/, 'creates a SEP-31 payment (POST /transactions)'],
  [/^Account Signer Support$/, 'funds testnet accounts and submits transactions'],
];

export const exclusionReason = (test: LibTest): string =>
  GROUP_REASONS.find(([pattern]) => pattern.test(test.group))?.[1] ??
  'depends on a write request or on anchor-provided transaction ids in config';

const dependenciesOf = (test: LibTest, config: LibConfig): LibTest[] =>
  typeof test.dependencies === 'function' ? test.dependencies(config) : (test.dependencies ?? []);

export const isSafeClosure = (
  test: LibTest,
  config: LibConfig,
  seen: Set<string> = new Set(),
): boolean => {
  const id = testKey(test);
  if (!SAFE_TESTS.has(id)) return false;
  if (seen.has(id)) return true;
  seen.add(id);
  return dependenciesOf(test, config).every((dep) => isSafeClosure(dep, config, seen));
};

const DUMMY_CUSTOMERS = { c1: {}, c2: {}, c3: {}, c4: {} };

export const anchorTestsConfig = (
  domain: string,
  seps: number[],
  networkPassphrase: string = NETWORK_PROFILES[DEFAULT_NETWORK].passphrase,
): LibConfig => ({
  homeDomain: `https://${domain}`,
  seps,
  networkPassphrase,
  sepConfig: {
    ...(seps.includes(12)
      ? {
          '12': {
            customers: DUMMY_CUSTOMERS,
            createCustomer: 'c1',
            deleteCustomer: 'c2',
            sameAccountDifferentMemos: ['c3', 'c4'],
          },
        }
      : {}),
    ...(seps.includes(38) ? { '38': { contexts: ['sep6', 'sep31'] } } : {}),
  },
});

const FAILED_DEPENDENCY = 'failed dependency';

const emptyResult = (): AnchorSepResult => ({
  passed: 0,
  failed: 0,
  skipped: 0,
  blocked: 0,
  names: [],
});

const record = (perSep: Record<string, AnchorSepResult>, run: LibRun) => {
  const sep = String(run.test.sep);
  const result = perSep[sep] ?? emptyResult();
  if (run.result.failure?.name === FAILED_DEPENDENCY) {
    result.blocked += 1;
  } else if (run.result.failure) {
    result.failed += 1;
    result.names.push(`${run.test.group}: ${run.test.assertion} (${run.result.failure.name})`);
  } else if (run.result.skipped) {
    result.skipped += 1;
  } else {
    result.passed += 1;
  }
  perSep[sep] = result;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

export type RunSafeOptions = {
  lib?: AnchorTestsLib;
  timeoutMs?: number;
  networkPassphrase?: string;
};

export const runSafeAnchorTests = async (
  domain: string,
  requestedSeps: AnchorTestSep[],
  { lib = anchorTestsLib, timeoutMs = 120_000, networkPassphrase }: RunSafeOptions = {},
): Promise<AnchorTestsReport> => {
  const excludedSeps = requestedSeps.flatMap((sep) => {
    const reason = EXCLUDED_SEPS[sep];
    return reason ? [{ sep, reason }] : [];
  });
  const ranSeps = requestedSeps.filter((sep) => !EXCLUDED_SEPS[sep]);
  const perSep: Record<string, AnchorSepResult> = {};
  const excludedTests: ExcludedTest[] = [];
  const report = (error: string | null): AnchorTestsReport => ({
    domain,
    requestedSeps,
    ranSeps,
    perSep,
    excludedSeps,
    excludedTests,
    error,
  });
  if (ranSeps.length === 0) return report(null);

  const config = anchorTestsConfig(domain, ranSeps, networkPassphrase);
  const deadline = Date.now() + timeoutMs;
  let iterator: AsyncIterator<LibRun> | null = null;
  try {
    const all = await lib.getTests(config);
    const allowed: LibTest[] = [];
    for (const test of all) {
      if (isSafeClosure(test, config)) allowed.push(test);
      else excludedTests.push({ ...pick(test), reason: exclusionReason(test) });
    }
    iterator = lib.runTests(allowed, config);
    while (true) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) return report(`timeout after ${timeoutMs}ms`);
      const next = await raceTimeout(iterator.next(), remaining);
      if (next === 'timeout') return report(`timeout after ${timeoutMs}ms`);
      if (next.done) break;
      record(perSep, next.value);
    }
    return report(null);
  } catch (error) {
    return report(errorMessage(error));
  } finally {
    void iterator?.return?.();
  }
};

const pick = ({ sep, group, assertion }: LibTest) => ({ sep, group, assertion });

const raceTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};
