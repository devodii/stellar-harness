import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  type AnchorTestsLib,
  anchorTestsConfig,
  exclusionReason,
  isSafeClosure,
  type LibRun,
  type LibTest,
  runSafeAnchorTests,
  SAFE_TESTS,
  testKey,
} from './anchor-tests';

const require = createRequire(import.meta.url);
const WRITE_GROUPS =
  /^(PUT|DELETE|POST \/quote|POST \/transactions|Account Signer Support)|\/(deposit|withdraw)$/;

const libraryTests = (seps: number[]): LibTest[] => {
  const config = anchorTestsConfig('anchor.example', seps);
  const all = new Map<string, LibTest>();
  const visit = (test: LibTest) => {
    if (all.has(testKey(test))) return;
    all.set(testKey(test), test);
    const deps =
      typeof test.dependencies === 'function' ? test.dependencies(config) : test.dependencies;
    for (const dep of deps ?? []) visit(dep);
  };
  for (const sep of seps) {
    const mod = require(`@stellar/anchor-tests/lib/tests/sep${sep}/tests`) as {
      default: LibTest[];
    };
    for (const test of mod.default) visit(test);
  }
  return [...all.values()];
};

describe('safe test allowlist against the installed library', () => {
  const seps = [1, 10, 12, 24, 38];
  const all = libraryTests(seps);
  const config = anchorTestsConfig('anchor.example', seps);

  it('names only tests that exist in @stellar/anchor-tests', () => {
    const keys = new Set(all.map(testKey));
    expect([...SAFE_TESTS].filter((k) => !keys.has(k))).toEqual([]);
  });

  it('keeps every allowed test and its dependencies inside the allowlist', () => {
    const allowed = all.filter((t) => isSafeClosure(t, config));
    expect(allowed).toHaveLength(SAFE_TESTS.size);
  });

  it('never allows a test from a write group', () => {
    const allowed = all.filter((t) => isSafeClosure(t, config));
    expect(allowed.filter((t) => WRITE_GROUPS.test(t.group))).toEqual([]);
    expect(all.filter((t) => WRITE_GROUPS.test(t.group)).length).toBeGreaterThan(10);
  });

  it('gives every excluded test a reason', () => {
    const excluded = all.filter((t) => !isSafeClosure(t, config));
    expect(excluded.map(exclusionReason).every((r) => r.length > 0)).toBe(true);
    expect(exclusionReason({ sep: 12, group: 'PUT /customer', assertion: 'x' })).toMatch(/PUT/);
    expect(exclusionReason({ sep: 24, group: '/deposit', assertion: 'x' })).toMatch(/deposit/);
  });
});

const toml: LibTest = {
  sep: 1,
  group: 'TOML Tests',
  assertion: 'the TOML file exists at ./well-known/stellar.toml',
};
const passphrase: LibTest = {
  sep: 1,
  group: 'TOML Tests',
  assertion: 'has a valid network passphrase',
  dependencies: [toml],
};
const jwt: LibTest = {
  sep: 10,
  group: 'POST /auth',
  assertion: 'returns a valid JWT',
  dependencies: [toml],
};
const putCustomer: LibTest = {
  sep: 12,
  group: 'PUT /customer',
  assertion: 'can create a customer',
  dependencies: [jwt],
};
const byId: LibTest = {
  sep: 12,
  group: 'GET /customer',
  assertion: "can retrieve customer using 'id'",
  dependencies: [putCustomer],
};

const fakeLib = (
  runs: (tests: LibTest[]) => LibRun[],
  all = [toml, passphrase, jwt, putCustomer, byId],
) => {
  const seen: { config?: unknown; tests?: LibTest[] } = {};
  const lib: AnchorTestsLib = {
    getTests: async (config) => {
      seen.config = config;
      return all;
    },
    runTests: (tests) => {
      seen.tests = tests;
      return (async function* () {
        yield* runs(tests);
      })();
    },
  };
  return { lib, seen };
};

describe('runSafeAnchorTests', () => {
  it('runs only safe tests and reports per sep results', async () => {
    const { lib, seen } = fakeLib((tests) =>
      tests.map((test) => ({
        test,
        result: test === jwt ? { failure: { name: 'invalid JWT' } } : {},
      })),
    );
    const report = await runSafeAnchorTests('clpx.finance', [1, 10, 12, 31], { lib });
    expect(seen.tests).toEqual([toml, passphrase, jwt]);
    expect(seen.config).toMatchObject({
      homeDomain: 'https://clpx.finance',
      seps: [1, 10, 12],
      networkPassphrase: 'Public Global Stellar Network ; September 2015',
    });
    expect(report.perSep).toEqual({
      '1': { passed: 2, failed: 0, skipped: 0, names: [] },
      '10': {
        passed: 0,
        failed: 1,
        skipped: 0,
        names: ['POST /auth: returns a valid JWT (invalid JWT)'],
      },
    });
    expect(report.ranSeps).toEqual([1, 10, 12]);
    expect(report.excludedSeps.map((s) => s.sep)).toEqual([31]);
    expect(report.excludedTests.map((t) => [t.group, t.reason])).toEqual([
      ['PUT /customer', 'writes a customer record (PUT /customer)'],
      [
        'GET /customer',
        'depends on a write request or on anchor-provided transaction ids in config',
      ],
    ]);
    expect(report.error).toBeNull();
  });

  it('records library config errors', async () => {
    const lib: AnchorTestsLib = {
      getTests: async () => {
        throw Object.assign(new Error('NETWORK_PASSPHRASE is not one of the accepted values'), {
          name: 'ConfigError',
        });
      },
      runTests: () => {
        throw new Error('unreachable');
      },
    };
    const report = await runSafeAnchorTests('x.example', [1], { lib });
    expect(report.error).toBe('ConfigError: NETWORK_PASSPHRASE is not one of the accepted values');
  });

  it('stops at the timeout and keeps partial results', async () => {
    const lib: AnchorTestsLib = {
      getTests: async () => [toml, passphrase],
      runTests: () =>
        (async function* () {
          yield { test: toml, result: {} };
          await new Promise(() => {});
        })(),
    };
    const report = await runSafeAnchorTests('slow.example', [1], { lib, timeoutMs: 50 });
    expect(report.error).toBe('timeout after 50ms');
    expect(report.perSep['1']?.passed).toBe(1);
  });

  it('runs nothing when every requested sep is excluded', async () => {
    const { lib, seen } = fakeLib(() => []);
    const report = await runSafeAnchorTests('x.example', [31], { lib });
    expect(seen.config).toBeUndefined();
    expect(report.ranSeps).toEqual([]);
  });
});
