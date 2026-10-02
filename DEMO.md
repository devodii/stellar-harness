# Demo script

A three-minute screen recording. Run a scan first (`pnpm scan all --window 1d`) so the header and `/findings` have data, then `pnpm dev` with `ANTHROPIC_API_KEY` set. Every value below is a real mainnet subject checked with read-only requests; the suggestion chips use the same values when the scan does not supply better ones.

| Subject | Value |
| --- | --- |
| Failed transaction (`op_no_trust`, ledger 64,722,800) | `e2173f4a7f63a3d57bbbf442e72511938aae136e802045d26e564418878c5662` |
| Anchor with an unreadable `/info` | `mykobo.co` |
| USDC holder | `GAPV2C4BTHXPL2IVYDXJ5PUU7Q3LAXU7OAQDP7KVYHLCNM2JTAJNOQQI` |
| Account without a USDC trustline | `GBNPYM6DEBZE5BERKK6EADIHLP2XS3NRX7SKQSJVCAAQ2E52YA5ODU4K` |
| Contract | `CDZYZVZNURK4DCD3ZJMBKLDYCB7FIYL3FRVSLRLGL2BEOIN53UP4YNQC` |

## 0:00 Header (15 s)

Open `/`. Point at the live strip: the latest ledger ticks every few seconds from Horizon; the other numbers (failed transactions in the window, preventable share, archived contracts, failing anchors) come from the scan. Hover a number to show its label.

## 0:15 A failed transaction, explained and planned (45 s)

Click "Why did tx e2173f…5662 fail?". The agent calls `getTransaction`, then `explainFailure`, then `planFix`. Show:

- the transaction card with `tx_failed` and the failing operation's `op_no_trust`,
- the plain-language explanation and that it is in the preventable set,
- the plan: `[read]` steps marked done, then the trustline pre-flight and sponsorship steps.

## 1:00 SCF-funded contracts and an approval boundary (60 s)

Click "SCF contracts archived or expiring in 30d". The agent queries findings tagged `scf_funded` and renders the table. Ask it to extend the first live one. It runs `simulateExtendTtl` (365 days) and proposes a plan whose `submit` step crosses the policy boundary. Show the boundary block (rule, requested amount, threshold), click **Approve (demo)**, and show the agent running only the read and simulate steps. Read the footnote aloud: nothing is signed or broadcast.

## 2:00 Anchor conformance (30 s)

Click "Is mykobo.co conformant?". `probeAnchor` runs the nine stages live; the stage table shows `stellar.toml` passing and `/info` failing because the transfer server host does not resolve. The agent turns the finding into a plan.

## 2:30 Findings explorer (30 s)

Open `/findings`. Filter severity to `critical`, then type `ANCHOR_TOML_UNREACHABLE` or `CONTRACT_INSTANCE_ARCHIVED`. Click a row to open the drawer with the evidence JSON, then **Open in chat** to start a conversation that runs `planFix` on it.

## Optional extras

- "Pre-flight a 25 USDC payment" shows `buildPaymentPreflight` blocking on the missing trustline and offering a sponsored-trustline plan.
- "12 month rent for CDZY…YNQC" shows a single `simulateExtendTtl` cost in XLM.
