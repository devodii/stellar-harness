import { NETWORK_COOKIE } from '@harness/schema';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { POST } from './route';

const context = { params: Promise.resolve({}) };
const post = (body: unknown) =>
  new NextRequest(new URL('/api/network', 'http://localhost'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/network', () => {
  it('stores the chosen network in a lax, year-long, script-readable cookie', async () => {
    const response = await POST(post({ network: 'testnet' }), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ network: 'testnet' });
    const header = response.headers.get('set-cookie') ?? '';
    expect(header).toContain(`${NETWORK_COOKIE}=testnet`);
    expect(header).toContain('Max-Age=31536000');
    expect(header.toLowerCase()).toContain('samesite=lax');
    expect(header.toLowerCase()).not.toContain('httponly');
  });

  it('rejects unknown networks without touching the cookie', async () => {
    const response = await POST(post({ network: 'futurenet' }), context);
    expect(response.status).toBe(400);
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
