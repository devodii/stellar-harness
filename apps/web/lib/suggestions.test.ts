import { emptySummary, type Network } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { MAINNET_FALLBACKS } from './mainnet-fallbacks';
import { buildSuggestions } from './suggestions';
import { TESTNET_FALLBACKS } from './testnet-fallbacks';

const snapshotFor = (network: Network) => ({
  snapshotLedger: 100,
  snapshotTime: '2026-10-02T00:00:00.000Z',
  ledgerCloseSeconds: 5.8,
  gitSha: 'abc',
  network,
});

const withFailingAnchor = (network: Network) => {
  const base = emptySummary(snapshotFor(network));
  return {
    ...base,
    anchors: {
      ...base.anchors,
      domainsTested: 3,
      failing: [{ domain: 'anchor.example', country: null, region: null, stage: 'info' as const }],
    },
  };
};

const prompts = (network?: Network) => buildSuggestions(null, network).map((s) => s.prompt);

describe('buildSuggestions', () => {
  it('uses real mainnet fallbacks without a scan', () => {
    const suggestions = buildSuggestions(null);
    expect(suggestions).toHaveLength(6);
    expect(suggestions[0]?.prompt).toContain(MAINNET_FALLBACKS.failedTxHash);
    expect(suggestions[1]?.id).toBe('scf-archival');
    expect(suggestions[2]?.prompt).toBe(
      `Check whether ${MAINNET_FALLBACKS.anchorDomain} is conformant`,
    );
    expect(suggestions[3]?.prompt).toContain(MAINNET_FALLBACKS.noUsdcTrustline);
    expect(suggestions[5]?.prompt).toBe(
      `What does it cost to keep ${MAINNET_FALLBACKS.contract} alive for 12 months?`,
    );
  });

  it('prefers subjects from the scan summary', () => {
    expect(buildSuggestions(withFailingAnchor('mainnet'))[2]?.prompt).toBe(
      'Check whether anchor.example is conformant',
    );
  });

  it('uses testnet subjects and names the network on testnet', () => {
    const suggestions = buildSuggestions(null, 'testnet');
    expect(suggestions).toHaveLength(6);
    expect(suggestions[0]?.prompt).toBe(
      `Why did testnet transaction ${TESTNET_FALLBACKS.failedTxHash} fail, and what would you have done?`,
    );
    expect(suggestions[2]?.prompt).toBe(
      `Check whether ${TESTNET_FALLBACKS.anchorDomain} is conformant on testnet`,
    );
    expect(suggestions[3]?.prompt).toBe(
      `Pre-flight a 25 USDC payment on testnet from ${TESTNET_FALLBACKS.usdcHolder} to ${TESTNET_FALLBACKS.noUsdcTrustline}`,
    );
    expect(suggestions[5]?.prompt).toContain(`testnet contract ${TESTNET_FALLBACKS.contract}`);
  });

  it('swaps the mainnet-only SCF workflow for a ttl check on testnet', () => {
    const testnet = buildSuggestions(null, 'testnet');
    expect(testnet.map((s) => s.id)).not.toContain('scf-archival');
    expect(testnet[1]).toMatchObject({ id: 'ttl-expiry' });
    expect(testnet[1]?.prompt).toContain(TESTNET_FALLBACKS.contract);
    expect(testnet[1]?.prompt).toContain('30 days');
    expect(prompts('testnet').join(' ')).not.toMatch(/SCF/);
  });

  it('never mixes subjects across networks', () => {
    const joined = prompts('testnet').join(' ');
    for (const value of Object.values(MAINNET_FALLBACKS)) expect(joined).not.toContain(value);
    expect(buildSuggestions(withFailingAnchor('mainnet'), 'testnet')[2]?.prompt).toContain(
      TESTNET_FALLBACKS.anchorDomain,
    );
  });
});
