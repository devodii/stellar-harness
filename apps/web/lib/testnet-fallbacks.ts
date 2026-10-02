// Real testnet values checked live on 2026-10-02 with read-only requests (soroban-testnet RPC and
// the stellar.expert testnet API). Testnet RPC keeps about 7 days of transactions and testnet is
// reset periodically, so these go stale; refresh them the same way when they do.
export const TESTNET_FALLBACKS = {
  // Ledger 4978004, single eUAH payment failing with op_no_destination (RPC getTransaction FAILED).
  failedTxHash: '15d5bc1012633e0ea8dca33c3b35b033de7f5f2277a87f92a4f9f053fed82062',
  // SDF reference anchor: stellar.toml, SEP-10, SEP-6 and SEP-24 /info all answer.
  anchorDomain: 'testanchor.stellar.org',
  // Holds about 136.7M testnet USDC (Circle testnet issuer) and XLM.
  usdcHolder: 'GDDJCH66STY45NP4TIUJ7FHM53MGKAQQ3DVRRT7H4JUK7OKVDM7V7YW6',
  // Holds only XLM, no subentries and no USDC trustline.
  noUsdcTrustline: 'GDYNZFBHIZPHBNMD6H43FVLKTVIKOODYFTWZCEILSUJVWDLZVVVIZGLI',
  // Soroban contract with over 650k invocations, unverified source.
  contract: 'CD4KFB23CQLJ47RIPESVBTQ444R75M6QVEZULWXHHFYYZT7SS2VGXOPW',
  usdcIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
} as const;
