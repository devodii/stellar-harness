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
