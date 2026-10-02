import { NETWORK_PROFILES } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { getAgentTools, getLiveClients, getNetworkConfig, systemPromptFor } from './agent';

describe('per-network agent wiring', () => {
  it('loads each network config once with its own endpoints', () => {
    expect(getNetworkConfig('testnet')).toBe(getNetworkConfig('testnet'));
    expect(getNetworkConfig('testnet').NETWORK).toBe('testnet');
    expect(getNetworkConfig('testnet').RPC_URL).toBe(NETWORK_PROFILES.testnet.rpcUrl);
    expect(getNetworkConfig('testnet').ECOSYSTEM_DIRECTORY).toBe(false);
    expect(getNetworkConfig('mainnet').NETWORK_PASSPHRASE).toBe(
      NETWORK_PROFILES.mainnet.passphrase,
    );
  });

  it('memoizes clients and tools per network', () => {
    expect(getLiveClients('mainnet')).toBe(getLiveClients('mainnet'));
    expect(getLiveClients('mainnet')).not.toBe(getLiveClients('testnet'));
    expect(getLiveClients('testnet').config.NETWORK).toBe('testnet');
    expect(getAgentTools('testnet')).toBe(getAgentTools('testnet'));
    expect(getAgentTools('testnet')).not.toBe(getAgentTools('mainnet'));
  });

  it('tells the model which network it is on', () => {
    expect(systemPromptFor('testnet')).toContain('Every tool reads Stellar testnet.');
  });
});
