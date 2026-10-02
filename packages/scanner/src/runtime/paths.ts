import { dataDirFor } from '@harness/storage';
import { DEFAULT_NETWORK, type Network } from '../schema';

export { dataDirFor };

export const reportFileFor = (network: Network = DEFAULT_NETWORK): string =>
  network === 'mainnet' ? 'REPORT.md' : `REPORT.${network}.md`;
