import type { Network } from '@harness/schema';

const NETWORK_CONTEXT: Record<Network, string> = {
  mainnet: 'Network: mainnet. All tools read Stellar mainnet.',
  testnet:
    'Network: testnet. Use testnet endpoints; the ecosystem directory is mainnet-only. Testnet is reset periodically, so old accounts and contracts may be gone. Say testnet when you quote a fact.',
};

export const networkContext = (network: Network): string => NETWORK_CONTEXT[network];

export const withNetworkContext = (prompt: string, network: Network): string =>
  `${prompt}\n\n${networkContext(network)}`;
