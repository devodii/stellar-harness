import { DEFAULT_NETWORK, type Network } from '../schema';

export const dataDirFor = (baseDir: string, network: Network = DEFAULT_NETWORK): string =>
  network === 'mainnet' ? baseDir : `${baseDir.replace(/\/+$/, '')}-${network}`;

export const reportFileFor = (network: Network = DEFAULT_NETWORK): string =>
  network === 'mainnet' ? 'REPORT.md' : `REPORT.${network}.md`;
