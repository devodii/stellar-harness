import { DEFAULT_NETWORK, type Network } from '@harness/schema';

const EXPLORER: Record<Network, string> = {
  mainnet: 'https://stellar.expert/explorer/public',
  testnet: 'https://stellar.expert/explorer/testnet',
};

export type ExplorerKind = 'account' | 'tx' | 'contract' | 'ledger' | 'asset';

export const explorerUrl = (
  kind: ExplorerKind,
  id: string | number,
  network: Network = DEFAULT_NETWORK,
): string => `${EXPLORER[network]}/${kind}/${encodeURIComponent(String(id))}`;

export const subjectHref = (
  subjectKind: string,
  subject: string,
  network: Network = DEFAULT_NETWORK,
): string | undefined => {
  if (subjectKind === 'account') return explorerUrl('account', subject, network);
  if (subjectKind === 'contract') return explorerUrl('contract', subject, network);
  if (subjectKind === 'anchor_domain') return `https://${subject}/.well-known/stellar.toml`;
  if (subjectKind === 'repo' && subject.startsWith('https://')) return subject;
  return undefined;
};
