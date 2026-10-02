import { describe, expect, it } from 'vitest';
import { withNetworkContext } from './network-prompt';

describe('withNetworkContext', () => {
  it('appends the network line to the system prompt', () => {
    expect(withNetworkContext('base', 'mainnet')).toBe(
      'base\n\nNetwork: mainnet. All tools read Stellar mainnet.',
    );
    const testnet = withNetworkContext('base', 'testnet');
    expect(testnet.startsWith('base\n\nNetwork: testnet. Use testnet endpoints;')).toBe(true);
    expect(testnet).toContain('the ecosystem directory is mainnet-only');
  });
});
