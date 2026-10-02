import { describe, expect, it } from 'vitest';
import { NETWORK_PROFILES } from '../../schema';
import { loadNetworkConfig } from './config';
import { networkSelection, resolveNetwork } from './network';

describe('resolveNetwork', () => {
  it('defaults to mainnet', () => {
    expect(resolveNetwork()).toEqual({
      network: 'mainnet',
      passphrase: NETWORK_PROFILES.mainnet.passphrase,
    });
  });

  it('uses the profile passphrase of the selected network', () => {
    expect(resolveNetwork({ network: 'testnet' }).passphrase).toBe(
      NETWORK_PROFILES.testnet.passphrase,
    );
  });

  it('prefers an explicit passphrase', () => {
    expect(resolveNetwork({ network: 'testnet', networkPassphrase: 'custom' }).passphrase).toBe(
      'custom',
    );
  });
});

describe('networkSelection', () => {
  it('reads the network and passphrase from a config', () => {
    expect(networkSelection(loadNetworkConfig({}, 'testnet'))).toEqual({
      network: 'testnet',
      networkPassphrase: NETWORK_PROFILES.testnet.passphrase,
    });
  });
});
