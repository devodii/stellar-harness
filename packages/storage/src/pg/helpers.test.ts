import { describe, expect, it } from 'vitest';
import { finding } from '../testing';
import { batched, chunk } from './batch';
import { cacheRow, hostOfKey, isStorableEntry } from './cache';
import { findingRow } from './findings';
import { pendingMigrations } from './migrate';
import { withoutNul } from './sql';

const collect = async <T>(source: AsyncIterable<T>): Promise<T[]> => {
  const items: T[] = [];
  for await (const item of source) items.push(item);
  return items;
};

describe('batching', () => {
  it('chunks arrays', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });

  it('splits streams by rows and bytes', async () => {
    const rows = await collect(batched([1, 2, 3, 4, 5], { maxRows: 2 }));
    expect(rows).toEqual([[1, 2], [3, 4], [5]]);
    const sized = await collect(
      batched(['aaaa', 'bb', 'cc', 'dddddd'], {
        maxRows: 10,
        maxBytes: 5,
        sizeOf: (item) => item.length,
      }),
    );
    expect(sized).toEqual([['aaaa'], ['bb', 'cc'], ['dddddd']]);
  });
});

describe('withoutNul', () => {
  it('replaces NUL characters that jsonb rejects', () => {
    expect(withoutNul({ memo: 'a\u0000b', list: ['\u0000'] })).toEqual({
      memo: 'a�b',
      list: ['�'],
    });
  });

  it('keeps a literal backslash-u sequence and returns clean values untouched', () => {
    const value = { text: '\\u0000' };
    expect(withoutNul(value)).toBe(value);
    expect(withoutNul({ text: '\\\u0000' })).toEqual({ text: '\\�' });
  });
});

describe('cache rows', () => {
  const entry = {
    fetchedAt: '2026-10-02T00:00:00.000Z',
    status: 200,
    url: 'https://horizon.stellar.org/ledgers/1',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  };

  it('derives the host from the cache key', () => {
    expect(hostOfKey('horizon.stellar.org/abc')).toBe('horizon.stellar.org');
    expect(hostOfKey('nohost')).toBe('unknown');
    expect(cacheRow('testnet', 'h/k', entry)).toMatchObject({ network: 'testnet', host: 'h' });
  });

  it('refuses bodies postgres text cannot hold', () => {
    expect(isStorableEntry(entry)).toBe(true);
    expect(isStorableEntry({ ...entry, body: 'a\u0000' })).toBe(false);
  });
});

describe('findingRow', () => {
  it('lifts indexed columns out of the finding', () => {
    const row = findingRow('mainnet', finding(7, { tags: ['scf'] }));
    expect(row).toMatchObject({ finding_id: finding(7).findingId, subject: 'G7', tags: ['scf'] });
  });
});

describe('pendingMigrations', () => {
  it('orders numbered sql files and skips applied ones', () => {
    const files = ['0002_more.sql', 'README.md', '0001_init.sql', '0003_x.sql'];
    expect(pendingMigrations(files, new Set(['0001_init.sql']))).toEqual([
      '0002_more.sql',
      '0003_x.sql',
    ]);
  });
});
