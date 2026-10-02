# Progress

Resume here: read this file and `DECISIONS.md` first.

## M0: workspace, schema, storage, scaffolding

- Done: pnpm workspace, strict tsconfig, Biome, `@harness/schema`, `@harness/storage` (memory, json file, sqlite stub, factory), package stubs, `.env.example`, scanner image, compose file.
- Partial: `docker compose build` not yet verified on this machine (Docker daemon was not running).

## M1: network core and Census 2 (failed transactions)

- Done: `@harness/stellar-tools` core (per-host limiter, retries with `Retry-After`, disk cache, RPC, Horizon, stellar.expert, stellarlight, snapshot), result-code and envelope decoders tested against real mainnet XDR, scanner runner, checkpoints, findings sink, derived writers, the failures census (chunked RPC `getTransactions`, clusters, classification, summary, exports).
- Measured: RPC `getTransactions` at concurrency 8 sustains about 6 calls/s (~1,230 tx/s, about 4% 429s, all recovered). One call covers about 1.08 ledgers, so a 1-day window is about 17,000 calls (45 to 50 minutes).
- Finding: tx-level codes (`tx_bad_seq`, `tx_too_late`, ...) never reach ledger history; the five TX_* fingerprints are expected to be empty.
- Next: wire the failures census into `harness-scan` once the envelope decoder exposes per-operation details.

## M2: Census 3 (anchors)

- Done: domain list from stellarlight partners and projects, SCF recaps (Medium RSS), stellar.expert assets and transitive hosts; the nine-stage probe; read-only anchor-tests allowlist; funnel, summary and exports; `harness-scan anchors`.
- Measured: `--limit 4` run: 123 requests, 11 findings, funnel 4 / 4 / 2 / 2 / 2 / 1 / 0.

## M3: Census 1 (contracts) and Census 4 (rent)

- Done: stellar.expert enumeration, wasm families, instance and code TTL via `getLedgerEntries`, six contract fingerprints, SCF join, rent simulation with stratified sampling, exports, `harness-scan contracts` and `harness-scan rent`.
- Measured: `--limit 20`: 18 requests cold, 0 network calls warm; rent for 11 live instances: 13 requests cold, 0 warm.

## M4: Census 5, report, summary, CLI

- Done: GitHub census (skipped with a note without `GITHUB_TOKEN`), report renderer, summary assembly, export previews, run records, `harness-scan <census|all>` with `--limit`, `--window`, `--no-cache`, `--concurrency host=N`.
- In progress: full cold runs of contracts, rent and anchors.

## M5: tools and agent

- Done: tool registry (12 canonical tools with schemas and descriptions), result-code explanations, `planFix` for every finding type, policy boundaries, plan protocol, system prompt, AI SDK adapters; network tools for contracts, ecosystem search, accounts, transactions, preflight and anchors.
- In progress: one context builder that wires every tool to live clients for the web app.

## M6: web app

- In progress in parallel (Next.js 15, AI SDK 7, AI Elements, shadcn sidebar, Storybook).

## M7: polish

- Done: `scripts/refresh-public-data.ts` (`pnpm refresh:public`).
- Next: README, DEMO.md, Vercel config, final measured numbers.
