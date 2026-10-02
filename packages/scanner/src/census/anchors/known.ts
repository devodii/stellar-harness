import type { Network } from '../../schema';

export const KNOWN_ANCHORS: Record<Network, readonly string[]> = {
  mainnet: [],
  testnet: [
    'testanchor.stellar.org',
    'anchor-sep-server-dev.stellar.org',
    'api-dev.vibrantapp.com',
  ],
};
