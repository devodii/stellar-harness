import { describe, expect, it } from 'vitest';
import { createClients } from './clients';
import { loadNetworkConfig } from './config';
import { silentLogger } from './log';

describe('createClients', () => {
  const config = loadNetworkConfig({ CONCURRENCY_RPC: '5' });

  it('wires every client onto one shared http instance', () => {
    const clients = createClients(config, { log: silentLogger });
    expect(clients.rpc.url).toBe('https://mainnet.sorobanrpc.com');
    expect(clients.horizon.url).toBe('https://horizon.stellar.org');
    expect(clients.http.stats.totals().requests).toBe(0);
  });

  it('applies configured host limits and the anchor default', () => {
    const { http } = createClients(config, { log: silentLogger, limits: { 'api.example': 1 } });
    expect(http.limiter.limitFor('mainnet.sorobanrpc.com')).toBe(5);
    expect(http.limiter.limitFor('horizon.stellar.org')).toBe(8);
    expect(http.limiter.limitFor('api.example')).toBe(1);
    expect(http.limiter.limitFor('anchor.example.com')).toBe(2);
  });
});
