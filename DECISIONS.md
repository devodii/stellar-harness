# Decisions

Every call made without explicit direction is tagged `@decision` so it can be reviewed in one pass.

## Workspace

- `@decision` Internal packages export TypeScript source (`exports: ./src/index.ts`) and are not compiled to `dist`. `tsx`, `vitest` and Next.js (`transpilePackages`) all consume source directly, so `build` in a package is a type check.
- `@decision` Biome formats with single quotes, trailing commas and a 100 column width to match house style.

## Product: one organisation, one screen

- `@decision` The product is an operator agent for one organisation. The network-wide findings explorer, about page, live strip, chat history, plans, handoffs, Storybook, Docker and Vercel config, Postgres and the testnet scan view were deleted; the scanner keeps producing the public report on its own.
- `@decision` The scanner owns everything it uses (network core with caching and rate limits, decoders, anchor probe, contract helpers, its schemas and file storage) under `packages/scanner/src`, and imports no other workspace package. `@harness/stellar-tools` was rewritten as six small tools on `@stellar/stellar-sdk` because the product needs single live reads, not the scanner's rate-limited batch machinery. The two copies of the anchor probe differ on purpose: the scanner runs the full nine-stage probe and anchor tests, the product checks toml, signing key, `/info` and SEP-10.
- `@decision` The demo organisation is testnet only: two friendbot-funded accounts (treasury holds 100 testnet USDC bought on the testnet DEX, distribution has no trustline), and the `increment` example deployed twice as Escrow and Registry on 2026-10-02 and never extended. No third, archived contract was deployed: testnet's minimum persistent TTL is about seven days, so Escrow and Registry show real days left and archive on their own if nobody extends them. Secret keys stay in the local Stellar CLI keystore and never enter the repo.
- `@decision` The anchor is `testanchor.stellar.org`, SDF's testnet reference anchor, because a testnet organisation probing a third-party mainnet business as "our anchor" would misrepresent both. It passes every stage, so the anchor suggestion answers that no fix is needed instead of ending in an action card.
- `@decision` `withinPolicy` is true only when the operation is allowed and a cost is known and at or below `approvalAboveXlm`; an unknown cost needs approval. `dailySpendXlm` is shown in the policy tooltip but not enforced, since nothing executes.
- `@decision` Agent tools take organisation labels or roles ("Escrow", "treasury") as well as ids and reject subjects outside the organisation. `gpt-4.1` mangled 56-character ids when copying them between tool calls; labels removed that failure. A bare asset code in the payment preflight resolves to the issuer the sender holds.
- `@decision` The system prompt is the specified text plus four operational lines (use labels, what needs attention for contracts, how a missing trustline is fixed, record before describing and report policy as returned); without them `gpt-4.1` described fixes it never recorded.
- `@decision` The watched panel is a server component reading through cached tool calls (accounts and contracts 30 s, anchor 10 minutes) instead of an `/api/org` route; the chat calls `router.refresh()` when a reply finishes so new actions appear in the panel.
- `@decision` Proposed actions live in memory for the life of the server process and are shared by every visitor, which is enough for a demo; `packages/storage` is the one file to swap for a database.
- `@decision` Pilot requests append to `data/pilot.jsonl` (gitignored) through `POST /api/pilot`. This needs a writable filesystem, so a serverless deploy would need a store behind it.
- `@decision` The design keeps the existing tokens (Outfit, Instrument Serif, the green primary) in light mode only, at the user's request, instead of the patch's black on white. Vendored shadcn and AI Elements files were cut to the parts the screen uses and are linted like the rest of the code.
- `@decision` `gpt-4.1` does not stream reasoning, so there is no reasoning component. `OPENAI_MODEL` overrides it; an unsupported model surfaces as the OpenAI error in the chat.
- `@decision` Milestone commits use the `M9` to `M12` scope in conventional commits (for example `refactor(M9): ...`) so each stays atomic, instead of one `M<n>: summary` commit per milestone.
- `@decision` `knip` and `depcheck` run over the product packages; the scanner workspaces are excluded from `knip` because the patch exempts the scanner. `apps/web/.depcheckrc` lists the CSS and build-tool dependencies depcheck cannot see.

## Scanner

### Report and CLI

- `@decision` The report renderer is a pure function of `Summary`, export previews, methodology entries and run stats, so `REPORT.md` is reproducible from `data/` without network access.
- `@decision` `--window` accepts `s`, `m`, `h` and `d` units; the failures census clamps it to RPC retention.

### Network core

- `@decision` Only 2xx, 404 and 410 responses are cached. 429, 5xx, other 4xx and network failures never are. JSON-RPC errors and `getTransaction` NOT_FOUND are not cached either.
- `@decision` `getHealth`, `getLatestLedger` and Horizon's latest ledger always bypass the cache; partial pages at the chain tip are not cached. Closed ledgers are cached in full.
- `@decision` RPC requests use a constant `id: 1` so identical calls share a cache key; `resultMetaXdr`, diagnostic events and events are stripped from RPC transaction bodies before caching.
- `@decision` TLS and DNS failures are not retried and are not gaps; a gap is a retryable failure (429, 5xx, timeout, reset) still failing after 6 attempts. Backoff base 500 ms, cap 30 s, `Retry-After` honored up to 120 s.
- `@decision` Redirects are followed manually for every request, capped at 3. A fixed, honest user agent is sent; nothing is rotated.
- `@decision` The global concurrency cap of 32 is a constant; unknown hosts (anchor domains) get `CONCURRENCY_ANCHOR`.
- `@decision` `findingId` is sha256 of `type:subject:snapshotLedger`. `snapshotTime` is the latest Horizon ledger's `closed_at`.
- `@decision` Result codes follow Horizon's names, including its misspelling `op_not_aut_maintain_liabilities`; `txNoAccount` maps to `tx_no_source_account`.
- `@decision` Tx-level failure codes (`tx_bad_seq`, `tx_insufficient_fee`, `tx_too_late`, `tx_bad_auth`, `tx_insufficient_balance`) did not appear in 300,000 recent mainnet transactions (71,776 failed): the network rejects them at submission, so they never reach ledger history. The five TX_* fingerprints stay implemented but are expected to be empty from ledger data; their decoder tests use SDK-built XDR named `synthetic`. Observing them needs submission-side telemetry, which is what the harness would capture in the product.
- `@decision` stellar.expert asset sorts that work: `rating` (default), `trustlines`, `trades`, `payments`, `volume7d`. stellarlight `type=on-off-ramp` currently returns 0 partners and `type=anchor` returns 24.

### Census 1 and 4: contracts and rent

- `@decision` RPC returns hot-archived persistent entries as present with `liveUntilLedgerSeq: 0`; these count as archived. In the first 200 stellar.expert contracts, 85 instances were archived this way and none were missing outright.
- `@decision` Expiry buckets do not overlap: 30d is at most 30 days, 90d is over 30 and at most 90 days.
- `@decision` Idle activity is `invocations + subinvocation` because many contracts are only called by other contracts.
- `@decision` CONTRACT_CODE_ARCHIVED is one finding per wasm hash, tagged with the SCF tags of the whole family. Stellar asset contracts have no wasm family and appear as `stellar_asset` in `archivedByFamily`.
- `@decision` A missing `validation` field on stellar.expert counts as unverified.
- `@decision` The SCF round is the latest of `scfAwardedRounds`, or null when no numbered round exists. Repo contracts come from `codeVerified.mainnetContractId`.
- `@decision` Rent simulations use Circle's USDC issuer (`GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`) as the source account: a long-lived public account nobody here controls; simulation submits nothing.
- `@decision` `xlm12m` is the simulated resource fee alone; `estimatedXlm` adds the 100 stroop base fee. Rent totals sum simulated contracts with no population weighting. XLM/USD comes from CoinGecko once per run.
- `@decision` The rent sample seed is `20261002`; stratification is by invocation decile rank.

### Census 2: failed transactions

- `@decision` RPC `getTransactions` is the only source. The range is split into 100-ledger chunks, each paged with its own cursor until a transaction passes the chunk end. The window stays 720 ledgers inside RPC retention because the oldest ledgers age out during a long scan.
- `@decision` `--limit N` limits the failures census to the newest N ledgers.
- `@decision` The checkpoint is the highest ledger completed with no gap before it; chunks finished after a gap are recorded by id so a resume never duplicates rows.
- `@decision` `byCode` and cluster counts count each code once per transaction. A fee bump counts against the inner transaction's source and inner codes.
- `@decision` `sameLedgerCollisions` counts matching failures in ledgers where the account had two or more failures of any code.
- `@decision` `multisig` means med_threshold above 1 or more than one signer with weight above 0. `channel_pattern` uses only first operations of type `create_account` that carry a funder; Horizon's oldest retained operation is not always account creation, so this tag under-counts.
- `@decision` Transactions that fail to decode are skipped, still counted in `ledger_totals`, and listed as decode gaps.
- `@decision` `failed_tx` rows carry an optional `payment {destination, asset, amount}`. `reserveShortfallXlm` is the XLM needed for one more subentry and is attached to `OP_LOW_RESERVE_CLUSTER` only when above zero.
- `@decision` `getTransaction` reads RPC first and falls back to Horizon `/transactions/{hash}`.
- `@decision` Measured: one `getTransactions` call (limit 200) covers about 1.08 ledgers. A 1-day window is about 17,000 calls (about 45 to 50 minutes at the ~6 calls/s public RPC sustains at concurrency 8); the brief's 10 minute target for 1 day is not reachable on the public endpoint without a dedicated RPC.

### Census 3: anchors

- `@decision` SCF rounds 41 to 45 come from the Medium RSS feed (`/feed/stellar-community`). Only projects whose recap mentions anchors, a SEP number or on/off-ramps are kept, resolved through stellarlight project search; unresolved names are listed. If Medium fails, stellarlight `scfAwarded=1` filtered by round and anchor type is the fallback.
- `@decision` stellarlight `type=Anchor` projects are an extra domain source, merged into partners through `anchorProfile.slug`. stellar.expert assets are sorted by `trustlines` and use the record's `domain`, with Horizon `home_domain` as fallback.
- `@decision` A partner's toml host beats its website host; `www.` is dropped; social and code hosts are ignored. Hosts that are IPs, carry a port or are single-label are rejected, which also limits SSRF.
- `@decision` Only testnet or futurenet passphrases tag `testnet_toml` and skip network probes; any other non-mainnet value is tagged `nonstandard_passphrase` and probing continues.
- `@decision` A SEP-10 400 that requires `client_domain` counts as a pass with a note. SEP-10 and toml checks compare against the probed domain exactly, like the reference anchor tests.
- `@decision` Anchor findings use the domain as subject; account mismatches and issuer flags are grouped into one finding per domain with the accounts listed in evidence.
- `@decision` The funnel is cumulative. `perSep` keys are `sep1`, `sep6_24`, `sep10`, `sep31`, `sep38`, plus `tests:sepN` from anchor tests.
- `@decision` Transitive endpoint hosts are probed one level deep as their own domains.
- `@decision` `@stellar/anchor-tests` runs only an allowlist of tests that read or perform the SEP-10 handshake. Excluded because they write to third-party production servers: SEP-12 `PUT`/`DELETE /customer` and the `GET /customer` tests that depend on them, SEP-24 `/deposit`, `/withdraw` and the `/transaction(s)` tests that depend on them, SEP-38 `POST /quote` and its follow-up, SEP-10 account signer tests (friendbot and submission), and all of SEP-31 (it needs a configured sending anchor secret). Each saved report lists the exclusions with reasons; a test checks the allowlist against the installed library.
- `@decision` The SEP-10 challenge URL carries a fresh random account, so it never hits the cache; a warm rerun still makes those calls. The anchor-tests library uses its own HTTP client, so its runs are limited per domain instead of through the shared semaphore.

### Census 5: GitHub

- `@decision` GitHub issue search does not accept `topic:` qualifiers (those only apply to repository search), so the sweep runs each query globally and again scoped with `org:` and `repo:` qualifiers, packed into queries under GitHub's 256 character limit.
- `@decision` GitHub search returns at most 1,000 results per query. Truncated queries are recorded in the run stats and the report instead of being split by date.
- `@decision` An issue matched by several queries keeps the category of the first query in table order (TTL, then tx failures, then anchors).
- `@decision` GitHub findings use the issue URL as `subject` and `info` severity; the brief gives no severity for them.

### Result code names

- `@decision` Horizon's own mapping (`internal/codes/main.go` in stellar/stellar-horizon, pinned commit recorded in `packages/scanner/src/decode/horizon-codes.json`) is vendored and is the decoder's primary table; name derivation from XDR is only a fallback. A test checks all 208 mappings, and another requires an explanation for every code Horizon can emit. This fixed 17 divergences, including Soroban codes Horizon emits without the `op_` prefix (`function_trapped`, `resource_limit_exceeded`, `entry_archived`, `insufficient_refundable_fee`), `buy_not_authorized`, `sell_not_authorized`, `buy_no_issuer`, and `op_no_trust` for allow-trust and set-trustline-flags without a trustline.

### Scan runtime

- `@decision` A snapshot is taken once and reused by every later command until `--new-snapshot` is passed. A new snapshot clears `findings.jsonl`, `data/derived` and `data/state` so findings never mix snapshots; the disk cache is kept.
- `@decision` Each census command writes its CSV exports, a 20-row preview and a run record (wall time, requests, network calls, cache hits, gaps, methodology) under `data/derived`; `harness-scan report` builds `summary.json` and `REPORT.md` from those files alone.
- `@decision` DNS failures are retried for the configured infrastructure hosts (Horizon, RPC, stellar.expert, stellarlight) and fail fast for anchor domains. A local network outage during the first full run turned every request into `ENOTFOUND`; without this, a transient outage reads as hundreds of unreachable anchors.
- `@decision` The rent census reads contract rows from the contracts census output, so `rent` requires `contracts` to have run on the same snapshot; `all` orders them that way.

### Scope

- `@decision` The scanner writes files only (`data/`); its Postgres mirror, the import scripts and testnet scans were removed because their only consumer was the deleted web views. It still reads the repository root `.env`; `packages/scanner/.env.example` lists its variables.
- `@decision` The copied network core keeps its general network profiles, but every scan runs against mainnet.
- `@decision` The known-anchor seed list and the meaningful-count backfill were removed; the contracts census computes the meaningful counts itself, so a summary written before that change shows 0 until the contracts census reruns.
