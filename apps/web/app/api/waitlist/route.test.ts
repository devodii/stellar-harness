import { MemoryStorage } from '@harness/storage';
import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

const storage = new MemoryStorage();

vi.mock('@/lib/storage', () => ({ getStorage: () => storage }));

const { POST } = await import('./route');

const context = { params: Promise.resolve({}) };
const post = (body: unknown, ip: string) =>
  new NextRequest(new URL('/api/waitlist', 'http://localhost'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'vitest',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });

describe('POST /api/waitlist', () => {
  it('stores the pilot request and returns how many are waiting', async () => {
    const first = await POST(post({ email: 'ops@example.org' }, '10.0.0.1'), context);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ count: 1 });
    const second = await POST(post({ email: 'infra@example.org' }, '10.0.0.1'), context);
    expect(await second.json()).toEqual({ count: 2 });
  });

  it('rejects an invalid email without storing it', async () => {
    const response = await POST(post({ email: 'not-an-email' }, '10.0.0.2'), context);
    expect(response.status).toBe(400);
    expect(await storage.countWaitlist()).toBe(2);
  });

  it('rate limits repeated requests from one address', async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await POST(post({ email: `a${attempt}@example.org` }, '10.0.0.3'), context);
      statuses.push(response.status);
    }
    expect(statuses.at(-1)).toBe(429);
  });
});
