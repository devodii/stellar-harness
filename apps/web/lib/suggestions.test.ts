import { emptySummary } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { MAINNET_FALLBACKS } from './mainnet-fallbacks';
import { buildSuggestions } from './suggestions';

const snapshot = {
  snapshotLedger: 100,
  snapshotTime: '2026-10-02T00:00:00.000Z',
  ledgerCloseSeconds: 5.8,
  gitSha: 'abc',
  network: 'mainnet' as const,
};

describe('buildSuggestions', () => {
  it('uses real mainnet fallbacks without a scan', () => {
    const suggestions = buildSuggestions(null);
    expect(suggestions).toHaveLength(6);
    expect(suggestions[0]?.prompt).toContain(MAINNET_FALLBACKS.failedTxHash);
    expect(suggestions[2]?.prompt).toBe(
      `Check whether ${MAINNET_FALLBACKS.failingAnchorDomain} is conformant`,
    );
    expect(suggestions[3]?.prompt).toContain(MAINNET_FALLBACKS.noUsdcTrustline);
  });

  it('prefers subjects from the scan summary', () => {
    const base = emptySummary(snapshot);
    const summary = {
      ...base,
      anchors: {
        ...base.anchors,
        domainsTested: 3,
        failing: [
          { domain: 'anchor.example', country: null, region: null, stage: 'info' as const },
        ],
      },
    };
    expect(buildSuggestions(summary)[2]?.prompt).toBe('Check whether anchor.example is conformant');
  });
});
