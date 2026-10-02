# Demo script

A three-minute screen recording. Run a scan first (`pnpm scan all --window 1d`) so the header and `/findings` have data, then `pnpm dev` with `OPENAI_API_KEY` set in `.env`. Every value below is a real mainnet subject checked with read-only requests; the suggestion chips use the same values when the scan does not supply better ones.

| Subject                                               | Value                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| Failed transaction (`op_no_trust`, ledger 64,722,800) | `e2173f4a7f63a3d57bbbf442e72511938aae136e802045d26e564418878c5662` |
| Anchor with an unreadable `/info`                     | `mykobo.co`                                                        |
| USDC holder                                           | `GAPV2C4BTHXPL2IVYDXJ5PUU7Q3LAXU7OAQDP7KVYHLCNM2JTAJNOQQI`         |
| Account without a USDC trustline                      | `GBNPYM6DEBZE5BERKK6EADIHLP2XS3NRX7SKQSJVCAAQ2E52YA5ODU4K`         |
| Contract                                              | `CDZYZVZNURK4DCD3ZJMBKLDYCB7FIYL3FRVSLRLGL2BEOIN53UP4YNQC`         |

## 0:00 Header (15 s)

Open `/`. Point at the live strip: the latest ledger ticks every few seconds from Horizon; the other numbers (failed transactions in the window, preventable share, archived contracts, failing anchors) come from the scan. Hover `ARCHIVED (active)` to show the raw archived total behind the meaningful count.

## 0:15 Chip 1: a failed transaction (40 s)

Click "Why did tx e2173f…5662 fail?". The agent calls `getTransaction`, then `explainFailure`, then `planFix`. Show the transaction with `tx_failed` and the failing operation's `op_no_trust`, the plain-language explanation and that it is preventable, and the plan timeline: `[read]` and `[simulate]` steps, then the `[handoff]` block naming who can act (the account signer) and the roadmap note.

## 0:55 Chip 2: SCF-funded contracts (50 s)

Click "Which SCF-funded contracts are archived or expiring within 30 days, and what would restoring them cost?". The agent queries findings tagged `scf_funded`, simulates the restore or extension for one of them and ends at the handoff: anyone can pay for a restore or TTL extension, and the block shows the simulated XLM cost. Hover `[simulate]` to show that the cost comes from RPC `simulateTransaction` and nothing is signed or submitted.

## 1:45 Chip 3: anchor conformance (30 s)

Click "Is mykobo.co conformant?". `probeAnchor` runs the nine stages live; the timeline shows `stellar.toml` passing and `/info` failing because the transfer server host does not resolve. The plan hands off to the anchor operator.

## 2:15 Findings explorer (25 s)

Open `/findings`. It lists the meaningful findings by default (SCF-funded, 100+ invocations, or anchor domains); toggle `show all` to see everything. Open a row in the drawer, then **Open in chat** to attach it to a new conversation.

## 2:40 Connect organisation (20 s)

Click `connect organisation` in the top bar. The sheet explains continuous monitoring and that execution under a smart-account policy is the next phase; leave an email and submit to show `request received · N organisations waiting`.

## Optional extras

- "Pre-flight a 25 USDC payment" shows `buildPaymentPreflight` blocking on the missing trustline and offering a sponsored-trustline plan.
- "12 month rent for CDZY…YNQC" shows a single `simulateExtendTtl` cost in XLM.
