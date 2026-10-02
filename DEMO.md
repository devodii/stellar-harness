# Demo script

Open `/`. The left column shows what the harness watches for Demo Treasury Ltd on testnet: treasury and distribution with live XLM balances, Escrow and Registry with live days left, and the anchor's last probe (`toml ok · /info ok · sep-10 ok`). Hover `Policy` to show the card's rules. Each section below was run against the live testnet organisation with `gpt-4.1` on 2026-10-02.

## 1. Check all our contracts and tell me which need attention

Tools: `getOrg`, `getContractTtl(Escrow)`, `getContractTtl(Registry)`, `simulateExtendTtl(Escrow, 365)`, `simulateExtendTtl(Registry, 365)`, `proposeAction` twice.

Action cards: "Extend Escrow contract TTL to 365 days", 27.31 XLM, `needs approval`; "Extend Registry contract TTL to 365 days", 27.23 XLM, `needs approval`. Both have 6.9 days left and the cost is above the 10 XLM approval threshold.

## 2. Can we pay 25 USDC from treasury to distribution right now?

Tools: `buildPaymentPreflight(treasury, distribution, USDC, 25)` returns `op_no_trust · the receiving account has no trustline for this asset · the receiver adds a trustline, or the sender sponsors one for it`, then `proposeAction`.

Action card: "Sponsor USDC trustline for distribution", 0.5 XLM, `within policy`, operation `sponsor_trustline`. Hover Execute to show the coming soon tooltip naming Stellar Wallets Kit agent mode.

## 3. What would it cost to keep Escrow alive for a year?

Tools: `getContractTtl(Escrow)`, `simulateExtendTtl(Escrow, 365)`, `proposeAction`.

Action card: "Extend Escrow TTL to 1 year", 27.31 XLM, `needs approval`. The answer states the cost is above the 10 XLM approval threshold.

## 4. Is our anchor passing conformance?

Tools: `getOrg`, `probeAnchor(testanchor.stellar.org)`: toml ok, signing key ok, /info ok, sep-10 ok.

No action card: the anchor passes every stage, so the agent says no fix is needed. It does not invent one.

## Close

Click `request a pilot` in the header, leave an email, and the sheet shows `received · N waiting`.
