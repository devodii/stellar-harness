# Demo script

Open https://stellar-harness.vercel.app. Before anything is typed, the sidebar already lists proposed actions: the harness reads the organisation's contracts and accounts at boot and records what needs fixing. The chat model is not involved.

## Contract states

Registry was extended to the network maximum (about 180 days) on 2026-10-03 and shows a healthy number of days. Escrow is never extended, so it counts down:

- While Escrow is live, the seed and suggestion 1 propose `Extend TTL on Escrow by 180 days`, which needs approval because the simulated cost is above 10 XLM.
- Once Escrow archives (around 2026-10-09), they propose `Restore Escrow` instead.

`scripts/demo-org-keepalive.md` has the commands to extend or restore either contract.

## 1. Check all our contracts and tell me which need attention

The agent reads both contracts, simulates extending Escrow and proposes it. The card replaces the seeded one rather than adding a second copy.

## 2. Can we pay 25 USDC from treasury to distribution right now?

The payment preflight blocks on `op_no_trust`: distribution has no USDC trustline. The agent proposes sponsoring it for the 0.5 XLM base reserve, within policy.

## 3. What would it cost to keep Escrow alive for six months?

The agent simulates the longest single extension the network allows (180 days) and proposes it with its cost.

## 4. Is our anchor passing conformance?

The anchor is clpx.finance, a public mainnet anchor the demo organisation depends on but does not operate. The probe is read-only: toml, signing key and /info pass, and SEP-10 fails because the challenge names the wrong home domain. The agent reports this and proposes nothing.

## Execute and approve

Both buttons are disabled. Hovering them says execution is coming soon under the organisation's smart-account policy.
