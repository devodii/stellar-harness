import { z } from 'zod';

export const NETWORKS = ['mainnet', 'testnet'] as const;
export const Network = z.enum(NETWORKS);
export type Network = z.infer<typeof Network>;

export const DEFAULT_NETWORK: Network = 'mainnet';

export type NetworkProfile = {
  network: Network;
  label: string;
  passphrase: string;
  horizonUrl: string;
  rpcUrl: string;
  stellarExpertUrl: string;
  ecosystemDirectory: boolean;
};

export const NETWORK_PROFILES: Record<Network, NetworkProfile> = {
  mainnet: {
    network: 'mainnet',
    label: 'Mainnet',
    passphrase: 'Public Global Stellar Network ; September 2015',
    horizonUrl: 'https://horizon.stellar.org',
    rpcUrl: 'https://mainnet.sorobanrpc.com',
    stellarExpertUrl: 'https://api.stellar.expert/explorer/public',
    ecosystemDirectory: true,
  },
  testnet: {
    network: 'testnet',
    label: 'Testnet',
    passphrase: 'Test SDF Network ; September 2015',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    stellarExpertUrl: 'https://api.stellar.expert/explorer/testnet',
    ecosystemDirectory: false,
  },
};
