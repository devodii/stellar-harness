# Decisions

Every call made without explicit direction is tagged `@decision` so it can be reviewed in one pass.

## Workspace

- `@decision` Internal packages export TypeScript source (`exports: ./src/index.ts`) and are not compiled to `dist`. `tsx`, `vitest` and Next.js (`transpilePackages`) all consume source directly, so `build` in a package is a type check.
- `@decision` TypeScript 5.9 instead of 7.x. Next.js 15, Storybook and Biome tooling are verified against the 5.x compiler API.
- `@decision` Next.js 15.5 as the brief asks, even though 16.x is current. It matches the conventions already used in other projects.
- `@decision` Biome formats with single quotes, trailing commas and a 100 column width to match house style.
- `@decision` `AI_MODEL` defaults to `claude-sonnet-5`; the brief's `claude-sonnet-4-5` is superseded.
- `@decision` `POLICY_SPEND_CAP_XLM` is listed in `.env.example` (the brief references it in M5 but omits it from the env list).

## Schema

- `@decision` `Summary.findingsCount` is a partial record so a run that skipped a census still validates.
- `@decision` `Summary.contracts.scfFunded.projects[].round` is nullable because not every awarded project row carries a round.
- `@decision` `PlanState` adds `declined` to the brief's `proposed → awaiting_approval → approved → executed` chain so the Decline button has a terminal state.
- `@decision` The suggested action table lives in `@harness/schema` (`SUGGESTED_ACTION`, `ACTION_BY_CODE`) so scanner, agent and UI read one source. Anchor and repo finding types had no action in the brief; one line each was written for them.
- `@decision` `defineEnv(shape)` in `@harness/schema` is the single env loader. It throws on the first import with every missing or invalid variable listed.

## Storage

- `@decision` `Storage` gains `getFinding(findingId)`; `planFix(findingId)` needs a point lookup and scanning a page for it is wasteful.
- `@decision` The scan output (`data/`, `REPORT.md`) is gitignored, including `data/seed/`. Without a scan the web app renders `emptySummary()` from `@harness/schema` instead of a committed seed.

## Census 5: GitHub

- `@decision` GitHub issue search does not accept `topic:` qualifiers (those only apply to repository search), so the sweep runs each query globally and again scoped with `org:` and `repo:` qualifiers, packed into queries under GitHub's 256 character limit.
- `@decision` GitHub search returns at most 1,000 results per query. Truncated queries are recorded in the run stats and the report instead of being split by date.
- `@decision` An issue matched by several queries keeps the category of the first query in table order (TTL, then tx failures, then anchors).
- `@decision` GitHub findings use the issue URL as `subject` and `info` severity; the brief gives no severity for them.

## Report and CLI

- `@decision` The report renderer is a pure function of `Summary`, export previews, methodology entries and run stats, so `REPORT.md` is reproducible from `data/` without network access.
- `@decision` `--window` accepts `s`, `m`, `h` and `d` units; the failures census clamps it to RPC retention.
- `@decision` The scanner image takes the git SHA as a `GIT_SHA` build arg because `.git` is excluded from the Docker context.

## Agent logic and plans

- `@decision` Plan steps may name three non-tool actions: `buildTransaction`, `submitTransaction`, `draftNotice`. Read and simulate steps always name real tools; submit has no tool by design.
- `@decision` Fee, timebound, signature, float and limit clusters plan a policy notice instead of a submit because the failed transactions cannot be retried. Only channel-account and reserve top-up plans submit.
- `@decision` A plan's estimated cost comes from evidence `xlm12m`, channel count times 1.5 XLM, or a reserve top-up (default 2 XLM). Extend and restore plans without cost evidence carry no estimate; their submit step still forces approval.
- `@decision` When both apply, the `spend_cap` boundary wins over `submit_requires_approval`. A cost equal to the cap is within policy.
- `@decision` The plan state machine is strict: `proposed` must pass through `request_approval` before `approve`; `propose` is valid only on a fresh plan.
- `@decision` AI SDK input validation is a pass-through; `invokeTool` validates so bad input returns an `INVALID_INPUT` envelope the UI can render, instead of an SDK error part.
- `@decision` `getSummary` without stored data returns `emptySummary` with a placeholder snapshot (ledger 1, close time 5 s, git SHA `unknown`).
- `@decision` `simulateExtendTtl.days` defaults to 365 with a cap of 730; `simulateRestore.entries` is `instance`, `code` or `both` (default `both`).
- `@decision` Stroop amounts are integers and token amounts are decimal strings across all tool schemas.

## Network core

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

## Census 1 and 4: contracts and rent

- `@decision` RPC returns hot-archived persistent entries as present with `liveUntilLedgerSeq: 0`; these count as archived. In the first 200 stellar.expert contracts, 85 instances were archived this way and none were missing outright.
- `@decision` Expiry buckets do not overlap: 30d is at most 30 days, 90d is over 30 and at most 90 days.
- `@decision` Idle activity is `invocations + subinvocation` because many contracts are only called by other contracts.
- `@decision` CONTRACT_CODE_ARCHIVED is one finding per wasm hash, tagged with the SCF tags of the whole family. Stellar asset contracts have no wasm family and appear as `stellar_asset` in `archivedByFamily`.
- `@decision` A missing `validation` field on stellar.expert counts as unverified.
- `@decision` The SCF round is the latest of `scfAwardedRounds`, or null when no numbered round exists. Repo contracts come from `codeVerified.mainnetContractId`.
- `@decision` Rent simulations use Circle's USDC issuer (`GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`) as the source account: a long-lived public account nobody here controls; simulation submits nothing.
- `@decision` `xlm12m` is the simulated resource fee alone; `estimatedXlm` adds the 100 stroop base fee. Rent totals sum simulated contracts with no population weighting. XLM/USD comes from CoinGecko once per run.
- `@decision` The rent sample seed is `20261002`; stratification is by invocation decile rank.

## Census 2: failed transactions

- `@decision` RPC `getTransactions` is the only source. The range is split into 100-ledger chunks, each paged with its own cursor until a transaction passes the chunk end. The window stays 720 ledgers inside RPC retention because the oldest ledgers age out during a long scan.
- `@decision` `--limit N` limits the failures census to the newest N ledgers.
- `@decision` The checkpoint is the highest ledger completed with no gap before it; chunks finished after a gap are recorded by id so a resume never duplicates rows.
- `@decision` `byCode` and cluster counts count each code once per transaction. A fee bump counts against the inner transaction's source and inner codes.
- `@decision` `sameLedgerCollisions` counts matching failures in ledgers where the account had two or more failures of any code.
- `@decision` `multisig` means med_threshold above 1 or more than one signer with weight above 0. `channel_pattern` uses only first operations of type `create_account` that carry a funder; Horizon's oldest retained operation is not always account creation, so this tag under-counts.
- `@decision` Transactions that fail to decode are skipped, still counted in `ledger_totals`, and listed as decode gaps.
- `@decision` `failed_tx` rows carry an optional `payment {destination, asset, amount}` so plans can name the destination and asset. `reserveShortfallXlm` is the XLM needed for one more subentry and is attached to `OP_LOW_RESERVE_CLUSTER` only when above zero.
- `@decision` Payment preflight blocks an XLM payment that would drop the source below its minimum balance plus fee as `op_low_reserve`. The reserve locked by a sponsored trustline or claimable balance is the plan's `estimatedCostXlm`. When the sender must act first, no alternative plan is offered.
- `@decision` `getTransaction` reads RPC first and falls back to Horizon `/transactions/{hash}`.
- `@decision` Measured: one `getTransactions` call (limit 200) covers about 1.08 ledgers. A 1-day window is about 17,000 calls (about 45 to 50 minutes at the ~6 calls/s public RPC sustains at concurrency 8); the brief's 10 minute target for 1 day is not reachable on the public endpoint without a dedicated RPC.

## Census 3: anchors

- `@decision` SCF rounds 41 to 45 come from the Medium RSS feed (`/feed/stellar-community`). Only projects whose recap mentions anchors, a SEP number or on/off-ramps are kept, resolved through stellarlight project search; unresolved names are listed. If Medium fails, stellarlight `scfAwarded=1` filtered by round and anchor type is the fallback.
- `@decision` stellarlight `type=Anchor` projects are an extra domain source, merged into partners through `anchorProfile.slug`. stellar.expert assets are sorted by `trustlines` and use the record's `domain`, with Horizon `home_domain` as fallback.
- `@decision` A partner's toml host beats its website host; `www.` is dropped; social and code hosts are ignored. Hosts that are IPs, carry a port or are single-label are rejected, which also limits SSRF through the web tool.
- `@decision` Only testnet or futurenet passphrases tag `testnet_toml` and skip network probes; any other non-mainnet value is tagged `nonstandard_passphrase` and probing continues.
- `@decision` A SEP-10 400 that requires `client_domain` counts as a pass with a note. SEP-10 and toml checks compare against the probed domain exactly, like the reference anchor tests.
- `@decision` Anchor findings use the domain as subject; account mismatches and issuer flags are grouped into one finding per domain with the accounts listed in evidence.
- `@decision` The funnel is cumulative. `perSep` keys are `sep1`, `sep6_24`, `sep10`, `sep31`, `sep38`, plus `tests:sepN` from anchor tests.
- `@decision` Transitive endpoint hosts are probed one level deep as their own domains.
- `@decision` `@stellar/anchor-tests` runs only an allowlist of tests that read or perform the SEP-10 handshake. Excluded because they write to third-party production servers: SEP-12 `PUT`/`DELETE /customer` and the `GET /customer` tests that depend on them, SEP-24 `/deposit`, `/withdraw` and the `/transaction(s)` tests that depend on them, SEP-38 `POST /quote` and its follow-up, SEP-10 account signer tests (friendbot and submission), and all of SEP-31 (it needs a configured sending anchor secret). Each saved report lists the exclusions with reasons; a test checks the allowlist against the installed library.
- `@decision` The census runs anchor tests by default; the `probeAnchor` tool runs them only when asked.
- `@decision` The SEP-10 challenge URL carries a fresh random account, so it never hits the cache; a warm rerun still makes those calls. The anchor-tests library uses its own HTTP client, so its runs are limited per domain instead of through the shared semaphore.

## Result code names

- `@decision` Horizon's own mapping (`internal/codes/main.go` in stellar/stellar-horizon, pinned commit recorded in `packages/stellar-tools/src/decode/horizon-codes.json`) is vendored and is the decoder's primary table; name derivation from XDR is only a fallback. A test checks all 208 mappings, and another requires an explanation for every code Horizon can emit. This fixed 17 divergences, including Soroban codes Horizon emits without the `op_` prefix (`function_trapped`, `resource_limit_exceeded`, `entry_archived`, `insufficient_refundable_fee`), `buy_not_authorized`, `sell_not_authorized`, `buy_no_issuer`, and `op_no_trust` for allow-trust and set-trustline-flags without a trustline.

## Scan runtime

- `@decision` A snapshot is taken once and reused by every later command until `--new-snapshot` is passed. A new snapshot clears `findings.jsonl`, `data/derived` and `data/state` so findings never mix snapshots; the disk cache is kept.
- `@decision` Each census command writes its CSV exports, a 20-row preview and a run record (wall time, requests, network calls, cache hits, gaps, methodology) under `data/derived`; `harness-scan report` builds `summary.json` and `REPORT.md` from those files alone.
- `@decision` DNS failures are retried for the configured infrastructure hosts (Horizon, RPC, stellar.expert, stellarlight) and fail fast for anchor domains. A local network outage during the first full run turned every request into `ENOTFOUND`; without this, a transient outage reads as hundreds of unreachable anchors.
- `@decision` The rent census reads contract rows from the contracts census output, so `rent` requires `contracts` to have run on the same snapshot; `all` orders them that way.

## Deploy

- `@decision` Scan output stays out of git, including `data/public/`. A Vercel deploy is made with the Vercel CLI from a checkout where `pnpm refresh:public` has run: `.vercelignore` keeps raw scan output out of the upload while `data/public/` (summary plus findings trimmed under 5 MB, most severe first) is uploaded and traced into the functions. Set `HARNESS_DATA_DIR=../../data/public` on the Vercel project, whose root directory is `apps/web`.
- `@decision` The web app resolves `HARNESS_DATA_DIR` from its own working directory and defaults to `../../data` (the repository's `data/`); Docker sets `/app/data`.

## Web app

- `@decision` The design follows the user's design system exactly (Outfit, Instrument Serif, the provided tokens) instead of the brief's black and white. Severity and status use only semantic tokens; primary and destructive text tones are derived from the same tokens with relative color syntax because the dark `--destructive` and light `--primary` are not readable as text.
- `@decision` `/api/live` caches the Horizon ledger for 5 s and the summary for 30 s so the strip moves on every 5 s poll. Its window numbers come from the scan summary (`window: {days, txFailed, preventable, preventableShare}`) because the summary has no separate 24 h breakdown.
- `@decision` Without a scan, scan-derived numbers render as `n/a`; the chat, suggestions and tools work against live mainnet regardless.
- `@decision` `apiHandler` shows messages from errors the app raises itself and masks unexpected throws, so a missing `ANTHROPIC_API_KEY` reaches the user verbatim.
- `@decision` Plan approval travels as a `data-plan-approval` part `{type: 'plan-approval', planId, decision}` on a user message; the chat route converts it to text the agent parses with `parsePlanApproval`.
- `@decision` Chat URLs are `/?c=<id>`; `/?q=<prompt>` starts a new chat, which is how "Open in chat" on `/findings` works. Conversations are capped at 50 in local storage.
- `@decision` AI Elements no longer ships `Loader`; `Shimmer` is used instead. The chat route passes `instructions` because `system` is deprecated in AI SDK 7.
- `@decision` The web app renders tool results against the canonical tool schemas through client-safe entries (`@harness/stellar-tools/schemas`, `@harness/agent/protocol`), so the browser bundle never includes network clients.
- `@decision` Suggestion fallbacks are real mainnet values checked live (a failed `op_no_trust` transaction, an anchor with a broken SEP-24 host, a USDC holder, an account without a USDC trustline, a live contract).

## Postgres

- `@decision` Postgres (compose service, `postgres:17-alpine`) holds the HTTP cache, findings, summaries, snapshots, derived census rows and artifacts, every row keyed by network. Plain SQL migrations under `packages/storage/migrations`, applied by `pnpm db:migrate`; queries use the `postgres` driver's tagged templates, no ORM. Chats are not stored.
- `@decision` Files stay the fallback: without `DATABASE_URL`, storage and cache use `data/` (mainnet) and `data-testnet/` (testnet) exactly as before. CSV exports always stay on disk.
- `@decision` `pnpm db:import` copies an existing data directory into Postgres without modifying a single file (verified by byte and mtime checks); it is idempotent and resumable.
- `@decision` `http_cache` stores the request url so a row rebuilds the full cache entry. jsonb cannot hold NUL characters: bodies with NUL are not cached, and NUL inside findings or rows becomes U+FFFD.
- `@decision` The compose host port is `${POSTGRES_PORT:-5432}`; this machine already uses 5432, so local `.env` sets 55432.

## Testnet

- `@decision` The network is a first-class input: `harness-scan --network testnet`, a `harness-network` cookie in the web app, and per-network config, clients, storage and agent tools. Testnet stays read-only.
- `@decision` On testnet, stellarlight and Medium sources, the SCF join and the GitHub census are skipped and the skip is written into each run record. Testnet anchors come from three SDF testnet anchors checked to serve a testnet toml, plus the stellar.expert testnet asset list.
- `@decision` When Horizon is unavailable, account reads fall back to RPC ledger entries (XLM balance only), the snapshot is taken from RPC `getHealth`, and payment preflight refuses to guess trustlines. The scanner checks Horizon once at start and records the outcome.
- `@decision` Simulation source accounts are per network: Circle's USDC issuer on mainnet and Circle's testnet USDC issuer on testnet.
- `@decision` A 365-day extension whose resource fee exceeds the uint32 transaction fee field (about 429 XLM) cannot be assembled into one transaction; the simulated fee is kept as the estimate and the unsimulated draft is shown as the XDR.
- `@decision` With `DATABASE_URL` set, the scanner reads and writes snapshots, findings, derived rows, previews, run records and the HTTP cache in Postgres; checkpoints and CSV exports stay on disk. A mainnet report rebuilt from Postgres matches the file-based report.

- `@decision` The chat model comes from a provider registry (`AI_PROVIDER` = `openai` or `anthropic`, default `openai`; `AI_MODEL` overrides the default `gpt-5.5` or `claude-sonnet-5`). Only the selected provider's key is required.

- `@decision` The chat uses OpenAI only (`gpt-5.5`, `apps/web/lib/model.ts`); the Anthropic provider and the `AI_PROVIDER`/`AI_MODEL` switches were removed to keep configuration minimal. The web app loads the repository root `.env` through `@next/env`, so one env file serves the scanner and the web app.
