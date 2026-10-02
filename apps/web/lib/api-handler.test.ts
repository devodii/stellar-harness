import { appError, err, ok } from '@harness/schema';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { apiHandler, readQuery, toSnakeCase } from './api-handler';

const context = { params: Promise.resolve({}) };
const get = (url: string) => new NextRequest(new URL(url, 'http://localhost'));

describe('apiHandler', () => {
  it('validates the query and returns the value as json', async () => {
    const route = apiHandler({
      name: 'test.echo',
      schema: { query: z.object({ n: z.coerce.number().int() }) },
      handler: ({ query }) => ok({ doubled: query.n * 2 }),
    });
    const good = await route(get('/api?n=21'), context);
    expect(good.status).toBe(200);
    expect(await good.json()).toEqual({ doubled: 42 });

    const bad = await route(get('/api?n=x'), context);
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe('INVALID_INPUT');
  });

  it('exposes app errors and masks unexpected throws', async () => {
    const known = apiHandler({
      name: 'test.known',
      handler: () => err(appError('NOT_FOUND', 'No such finding')),
    });
    const knownRes = await known(get('/api'), context);
    expect(knownRes.status).toBe(404);
    expect((await knownRes.json()).error.message).toBe('No such finding');

    const unknown = apiHandler({
      name: 'test.unknown',
      handler: () => {
        throw new Error('secret detail');
      },
    });
    const unknownRes = await unknown(get('/api'), context);
    expect(unknownRes.status).toBe(500);
    expect((await unknownRes.json()).error.message).not.toContain('secret');
  });

  it('rate limits per client', async () => {
    const limited = apiHandler({
      name: 'test.limited',
      rateLimit: { limit: 1, windowSeconds: 60 },
      handler: () => ok(true),
    });
    expect((await limited(get('/api'), context)).status).toBe(200);
    const blocked = await limited(get('/api'), context);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('rejects duplicate route names', () => {
    apiHandler({ name: 'test.dup', handler: () => ok(1) });
    expect(() => apiHandler({ name: 'test.dup', handler: () => ok(1) })).toThrow(/unique/);
  });
});

describe('helpers', () => {
  it('collects repeated query keys into arrays', () => {
    expect(readQuery(new URLSearchParams('type=a&type=b&limit=5'))).toEqual({
      type: ['a', 'b'],
      limit: '5',
    });
  });

  it('converts keys to snake case deeply', () => {
    expect(toSnakeCase({ latestLedger: 1, nested: [{ closedAt: 'x' }] })).toEqual({
      latest_ledger: 1,
      nested: [{ closed_at: 'x' }],
    });
  });
});
