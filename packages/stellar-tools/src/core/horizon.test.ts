import { describe, expect, it } from 'vitest';
import fixtures from './__fixtures__/horizon.json';
import { MemoryCache } from './cache';
import { createHorizonClient } from './horizon';
import { jsonResponse, mockHttp } from './test-utils';

const HORIZON = 'https://horizon.stellar.org';
const ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

const setup = (route: (url: URL) => unknown, cache = new MemoryCache()) => {
  const mock = mockHttp(
    (url) => {
      const body = route(new URL(url));
      if (body === undefined) return null;
      return body === 404 ? jsonResponse(fixtures.notFound, 404) : jsonResponse(body);
    },
    { cache },
  );
  return { ...mock, cache, horizon: createHorizonClient({ http: mock.http, url: `${HORIZON}/` }) };
};

const txPage = (count: number, next: string | null) => ({
  _links: next ? { next: { href: next } } : {},
  _embedded: {
    records: Array.from({ length: count }, () => fixtures.transaction),
  },
});

describe('horizon client', () => {
  it('reads a ledger and the latest ledger without caching the latter', async () => {
    const { horizon, cache, calls } = setup((url) =>
      url.pathname === '/ledgers' ? fixtures.latestLedger : fixtures.ledger,
    );
    const ledger = await horizon.ledger(64720901);
    expect(ledger.ok && ledger.value).toMatchObject({
      sequence: 64720901,
      closed_at: '2026-10-01T21:31:27Z',
      failed_transaction_count: 41,
    });
    const latest = await horizon.latestLedger();
    expect(latest.ok && latest.value.sequence).toBe(64722901);
    expect(calls[1]?.url).toBe(`${HORIZON}/ledgers?order=desc&limit=1`);
    expect(cache.entries.size).toBe(1);
  });

  it('pages a ledger transactions via _links.next', async () => {
    const second = `${HORIZON}/ledgers/7/transactions?cursor=abc&include_failed=true&limit=200`;
    const { horizon, calls } = setup((url) =>
      url.searchParams.get('cursor') === 'abc' ? txPage(3, `${second}&x`) : txPage(200, second),
    );
    const result = await horizon.ledgerTransactions(7);
    expect(result.ok && result.value).toHaveLength(203);
    expect(calls.map((call) => call.url)).toEqual([
      `${HORIZON}/ledgers/7/transactions?include_failed=true&limit=200`,
      second,
    ]);
  });

  it('parses real ledger transaction records', async () => {
    const { horizon } = setup(() => fixtures.ledgerTransactions);
    const result = await horizon.ledgerTransactions(64722896);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value[0]).toMatchObject({ ledger: 64722896, memo_type: expect.any(String) });
  });

  it('returns an account or null on 404', async () => {
    const { horizon } = setup((url) => (url.pathname.endsWith(ISSUER) ? fixtures.account : 404));
    const account = await horizon.account(ISSUER);
    expect(account.ok && account.value).toMatchObject({
      home_domain: 'circle.com',
      thresholds: { med_threshold: 2 },
      flags: { auth_revocable: true },
    });
    expect(account.ok && account.value?.signers).toHaveLength(5);
    expect(await horizon.account('GMISSING')).toEqual({ ok: true, value: null });
  });

  it('lists account operations with order and limit', async () => {
    const { horizon, calls } = setup(() => fixtures.accountOperations);
    const result = await horizon.accountOperations(ISSUER, { order: 'asc', limit: 1 });
    expect(calls[0]?.url).toBe(`${HORIZON}/accounts/${ISSUER}/operations?order=asc&limit=1`);
    expect(result.ok && result.value.records[0]).toMatchObject({ type: 'payment', type_i: 1 });
    expect(result.ok && result.value.next).toContain('cursor=250892872533016577');
  });

  it('reads a transaction with result xdr and timebounds', async () => {
    const { horizon } = setup((url) =>
      url.pathname.includes('6c37') ? fixtures.transaction : 404,
    );
    const tx = await horizon.transaction(fixtures.transaction.hash);
    expect(tx.ok && tx.value).toMatchObject({
      successful: false,
      fee_charged: '100',
      result_xdr: 'AAAAAAAAAGT/////AAAAAQAAAAAAAAAC////9AAAAAA=',
      preconditions: { timebounds: { max_time: '1790899290' } },
    });
    expect(await horizon.transaction('ffff')).toEqual({ ok: true, value: null });
  });

  it('keeps fee bump fields on transaction records', async () => {
    const { horizon } = setup(() => fixtures.transactions);
    const first = await horizon.transactions({ order: 'desc', limit: 2 }).next();
    const page = first.value;
    expect(page?.ok && page.value.records[0]?.fee_bump_transaction?.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(page?.ok && page.value.records[0]?.inner_transaction?.max_fee).toBe('232080');
  });

  it('iterates the transactions stream and only caches full pages', async () => {
    let served = 0;
    const { horizon, cache, calls } = setup(() => {
      served += 1;
      return served === 1 ? txPage(2, `${HORIZON}/transactions?cursor=2&limit=2`) : txPage(1, null);
    });
    const sizes: number[] = [];
    for await (const page of horizon.transactions({ cursor: '1', limit: 2 })) {
      if (page.ok) sizes.push(page.value.records.length);
    }
    expect(sizes).toEqual([2, 1]);
    expect(calls[0]?.url).toBe(
      `${HORIZON}/transactions?cursor=1&order=asc&limit=2&include_failed=true`,
    );
    expect(cache.entries.size).toBe(1);
  });
});
