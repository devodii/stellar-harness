import { describe, expect, it } from 'vitest';
import { explorerUrl, subjectHref } from './links';

describe('explorer links', () => {
  it('point at the public explorer by default and the testnet one on testnet', () => {
    expect(explorerUrl('tx', 'abc')).toBe('https://stellar.expert/explorer/public/tx/abc');
    expect(explorerUrl('tx', 'abc', 'testnet')).toBe(
      'https://stellar.expert/explorer/testnet/tx/abc',
    );
    expect(subjectHref('contract', 'CABC', 'testnet')).toBe(
      'https://stellar.expert/explorer/testnet/contract/CABC',
    );
    expect(subjectHref('anchor_domain', 'testanchor.stellar.org', 'testnet')).toBe(
      'https://testanchor.stellar.org/.well-known/stellar.toml',
    );
  });
});
