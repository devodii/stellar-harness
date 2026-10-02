import { appError, err } from '@harness/schema';
import { fakeFetcher } from '@harness/stellar-tools/contracts/testing';
import { describe, expect, it } from 'vitest';
import page1 from './__fixtures__/expert-contracts-page-1.json';
import page2 from './__fixtures__/expert-contracts-page-2.json';
import { CONTRACTS_DERIVED, enumerateContracts } from './enumerate';
import { memorySinks } from './testing';

const BASE = 'https://api.stellar.expert/explorer/public';
const HOST = 'https://api.stellar.expert';
const first = `${BASE}/contract?limit=200&order=desc`;
const second = `${HOST}${page1._links.next.href}`;
const third = `${HOST}${page2._links.next.href}`;
const empty = { _links: { next: { href: page2._links.next.href } }, _embedded: { records: [] } };

const routes = {
  [first]: { body: page1 },
  [second]: { body: page2 },
  [third]: { body: empty },
};

describe('enumerateContracts', () => {
  it('follows next links until an empty page and stores every record', async () => {
    const sinks = memorySinks();
    const result = await enumerateContracts({
      fetch: fakeFetcher(routes),
      stellarExpertUrl: BASE,
      ...sinks,
    });
    expect(result).toMatchObject({ pages: 3, complete: true, gap: null, invalid: 0 });
    expect(result.records.map((record) => record.contract)).toEqual([
      ...page1._embedded.records.map((record) => record.contract),
      ...page2._embedded.records.map((record) => record.contract),
    ]);
    expect(sinks.derived[CONTRACTS_DERIVED]).toHaveLength(6);
    expect(sinks.checkpoints.at(-1)).toEqual({
      cursor: page2._embedded.records[2]?.paging_token,
      enumerated: 6,
      pages: 2,
    });
  });

  it('honours --limit and checkpoints the last kept record', async () => {
    const sinks = memorySinks();
    const limitedFirst = `${BASE}/contract?limit=4&order=desc`;
    const result = await enumerateContracts(
      {
        fetch: fakeFetcher({ ...routes, [limitedFirst]: { body: page1 } }),
        stellarExpertUrl: BASE,
        ...sinks,
      },
      { limit: 4 },
    );
    expect(result.records).toHaveLength(4);
    expect(result.complete).toBe(false);
    expect(result.cursor).toBe(page2._embedded.records[0]?.contract);
  });

  it('resumes from a checkpointed cursor', async () => {
    const sinks = memorySinks();
    const cursor = page1._embedded.records[2]?.contract ?? '';
    const resumed = `${BASE}/contract?limit=200&order=desc&cursor=${cursor}`;
    const result = await enumerateContracts(
      {
        fetch: fakeFetcher({ ...routes, [resumed]: { body: page2 } }),
        stellarExpertUrl: BASE,
        ...sinks,
      },
      { cursor },
    );
    expect(result.records).toHaveLength(3);
    expect(result.complete).toBe(true);
  });

  it('records a gap and returns what it has when a page fails', async () => {
    const sinks = memorySinks();
    const fetch = fakeFetcher(routes);
    const failing: typeof fetch = async (url, init) =>
      url === second ? err(appError('RATE_LIMITED', 'gave up after 6 attempts')) : fetch(url, init);
    const result = await enumerateContracts({ fetch: failing, stellarExpertUrl: BASE, ...sinks });
    expect(result).toMatchObject({ complete: false, gap: { code: 'RATE_LIMITED' } });
    expect(result.records).toHaveLength(3);
  });
});
