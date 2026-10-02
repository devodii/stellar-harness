// Real mainnet values checked live on 2026-10-02 with read-only requests. Used only when the
// scan summary does not supply a better subject.
export const MAINNET_FALLBACKS = {
  // Ledger 64722800, single payment failing with op_no_trust.
  failedTxHash: 'e2173f4a7f63a3d57bbbf442e72511938aae136e802045d26e564418878c5662',
  // stellar.toml resolves, but TRANSFER_SERVER and TRANSFER_SERVER_SEP0024 point at a host that
  // does not resolve, so /info is unreadable.
  anchorDomain: 'mykobo.co',
  // Holds over 20M USDC (Circle issuer) and XLM.
  usdcHolder: 'GAPV2C4BTHXPL2IVYDXJ5PUU7Q3LAXU7OAQDP7KVYHLCNM2JTAJNOQQI',
  // Holds only XLM, no USDC trustline.
  noUsdcTrustline: 'GBNPYM6DEBZE5BERKK6EADIHLP2XS3NRX7SKQSJVCAAQ2E52YA5ODU4K',
  // Soroban contract with 130 invocations, unverified source.
  contract: 'CDZYZVZNURK4DCD3ZJMBKLDYCB7FIYL3FRVSLRLGL2BEOIN53UP4YNQC',
  usdcIssuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
} as const;
