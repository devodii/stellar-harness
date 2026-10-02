import { DEFAULT_NETWORK, NETWORK_PROFILES, type Network } from '../../schema';
import type { NetworkConfig } from './config';

export type NetworkSelection = { network?: Network; networkPassphrase?: string };

export type ResolvedNetwork = { network: Network; passphrase: string };

export const resolveNetwork = (selection: NetworkSelection = {}): ResolvedNetwork => {
  const network = selection.network ?? DEFAULT_NETWORK;
  return {
    network,
    passphrase: selection.networkPassphrase ?? NETWORK_PROFILES[network].passphrase,
  };
};

export const networkSelection = (
  config: Pick<NetworkConfig, 'NETWORK' | 'NETWORK_PASSPHRASE'>,
): Required<NetworkSelection> => ({
  network: config.NETWORK,
  networkPassphrase: config.NETWORK_PASSPHRASE,
});
