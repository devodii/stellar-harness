import { DEFAULT_NETWORK, type Network } from '@harness/schema';

export const dataDirFor = (baseDir: string, network: Network = DEFAULT_NETWORK): string =>
  network === 'mainnet' ? baseDir : `${baseDir.replace(/\/+$/, '')}-${network}`;
