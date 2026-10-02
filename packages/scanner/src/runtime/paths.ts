import { DEFAULT_NETWORK, type Network } from '@harness/schema';
import { dataDirFor } from '@harness/storage';

export { dataDirFor };

export const reportFileFor = (network: Network = DEFAULT_NETWORK): string =>
  network === 'mainnet' ? 'REPORT.md' : `REPORT.${network}.md`;
