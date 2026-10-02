const EXPLORER = 'https://stellar.expert/explorer/public';

export type ExplorerKind = 'account' | 'tx' | 'contract' | 'ledger' | 'asset';

export const explorerUrl = (kind: ExplorerKind, id: string | number): string =>
  `${EXPLORER}/${kind}/${encodeURIComponent(String(id))}`;

export const subjectHref = (subjectKind: string, subject: string): string | undefined => {
  if (subjectKind === 'account') return explorerUrl('account', subject);
  if (subjectKind === 'contract') return explorerUrl('contract', subject);
  if (subjectKind === 'anchor_domain') return `https://${subject}/.well-known/stellar.toml`;
  if (subjectKind === 'repo' && subject.startsWith('https://')) return subject;
  return undefined;
};
