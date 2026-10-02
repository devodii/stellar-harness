import { describe, expect, it } from 'vitest';
import { hostLimitsFromConfig, loadNetworkConfig } from './config';

describe('loadNetworkConfig', () => {
  it('falls back to brief defaults without any env', () => {
    const config = loadNetworkConfig({});
    expect(config.HORIZON_URL).toBe('https://horizon.stellar.org');
    expect(config.RPC_URL).toBe('https://mainnet.sorobanrpc.com');
    expect(config.CONCURRENCY_HORIZON).toBe(8);
    expect(config.CONCURRENCY_ANCHOR).toBe(2);
    expect(config.HARNESS_DATA_DIR).toBe('./data');
  });

  it('coerces numeric overrides', () => {
    expect(loadNetworkConfig({ CONCURRENCY_RPC: '3' }).CONCURRENCY_RPC).toBe(3);
  });

  it('fails loudly on an invalid url', () => {
    expect(() => loadNetworkConfig({ HORIZON_URL: 'not a url' })).toThrow(/HORIZON_URL/);
  });

  it('keys concurrency limits by host', () => {
    const limits = hostLimitsFromConfig(loadNetworkConfig({ CONCURRENCY_EXPERT: '2' }));
    expect(limits).toEqual({
      'horizon.stellar.org': 8,
      'mainnet.sorobanrpc.com': 8,
      'api.stellar.expert': 2,
      'stellarlight.xyz': 4,
    });
  });
});
