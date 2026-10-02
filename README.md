# Stellar Harness

An operator harness for Stellar. A large share of what goes wrong on Stellar mainnet every day is routine operational failure: contracts that archive because nobody extended their TTL, payments that fail on a missing trustline, anchors whose `stellar.toml` or SEP endpoints quietly broke. A policy-gated agent can detect these, plan around them and, later, fix them.

This repository is a demo of that idea in three parts:

1. **Scanner** (`packages/scanner`, `apps/scan-cli`): measures that operational debt across mainnet from public, read-only data and writes machine-readable findings, CSV exports, `data/summary.json` and `REPORT.md`.
2. **Tools** (`packages/stellar-tools`, `packages/agent`): the Stellar capabilities an agent needs (read, explain, plan, simulate) as typed functions shared by the scanner and the chat agent.
3. **Web demo** (`apps/web`): a chat harness whose suggested prompts run the workflows end to end, with a live header fed by the scanner.

## Safety

- Mainnet is read-only. The code never generates, stores, loads or asks for a secret key, and never calls `sendTransaction` or Horizon `POST /transactions`. `simulateTransaction` is used because it submits nothing.
- The only key ever created is a throwaway `Keypair.random()` public key for the SEP-10 challenge probe; it is discarded immediately.
- Approving a plan in the web demo is a UI gesture. Nothing is signed or broadcast. In the product, approval is a passkey signature on an auth entry against the organisation's smart account policy.
- The anchor conformance census runs only the `@stellar/anchor-tests` checks that read or perform the SEP-10 handshake. Tests that would create customers, deposits, withdrawals or quotes on third-party servers are excluded (see `DECISIONS.md`).

## Layout

```
packages/schema         Zod contracts: Finding, Snapshot, Summary, Plan, tool envelopes, env loader
packages/storage        Storage interface with memory, JSON file and SQLite implementations
packages/stellar-tools  Network core (limits, retries, cache), decoders, the 12 agent tools
packages/scanner        Censuses, runner, report
packages/agent          AI SDK tool adapters, system prompt, plan approval protocol
apps/scan-cli           harness-scan
apps/web                Next.js chat demo
```

## Requirements

Node 22, pnpm 10. Copy `.env.example` to `.env`; only `ANTHROPIC_API_KEY` is needed for the web agent and `GITHUB_TOKEN` for Census 5.

```bash
pnpm install
pnpm build && pnpm lint && pnpm test
```

## Running the scanner

```bash
pnpm scan all                         # anchors, contracts, rent, failures, github, report
pnpm scan anchors --limit 20          # one census, first 20 domains
pnpm scan failures --window 1d        # failed transactions over the last day
pnpm scan contracts --no-cache        # bypass the disk cache
pnpm scan rent --concurrency mainnet.sorobanrpc.com=4
pnpm scan report                      # rebuild summary.json and REPORT.md from data/
```

Each run takes one snapshot (ledger, time, measured close time, git SHA) in `data/state/snapshot.json` and reuses it until it is deleted, so every comparison in a run uses the same "now". Every GET and RPC call is cached under `data/cache/`; a rerun with a warm cache makes zero network calls, which the summary line at the end of each run shows. Runs checkpoint to `data/state/<census>.json` and resume after an interruption.

With Docker:

```bash
docker compose build
docker compose run --rm scanner pnpm scan anchors --limit 20
```

### Censuses

| Census | Source | Output |
| --- | --- | --- |
| 1. Contract archival | stellar.expert contract list, RPC `getLedgerEntries` | archived and expiring instances, archived code, idle and unverified contracts, SCF join |
| 2. Failed transactions | RPC `getTransactions`, `result_xdr` decoded with Horizon's code names | failures by code, preventable share, per-account clusters with classification |
| 3. Anchor conformance | stellarlight partners, SCF recaps, stellar.expert assets, each domain's `stellar.toml` | nine-stage probe per domain, funnel, read-only anchor tests |
| 4. Rent | RPC `simulateTransaction` of a 365-day TTL extension | 12-month rent per contract and in total |
| 5. GitHub | GitHub issue search | TTL, transaction failure and anchor conformance issues from the last 180 days |

`REPORT.md` lists every endpoint, parameter, threshold, window and sampling decision, plus measured wall time and request counts per census. Scan output (`data/`, `REPORT.md`) is not committed.

## Running the web demo

```bash
echo "ANTHROPIC_API_KEY=..." > apps/web/.env.local
pnpm dev                      # http://localhost:3000
pnpm --filter web storybook   # component catalogue
```

The landing page is the chat. It renders without a scan; scan-derived numbers show as `n/a` until `data/summary.json` exists. The agent reads mainnet live through the same tools the scanner uses and never signs or submits anything.

### Two-minute path

1. Read the live strip in the header: the ledger ticks from Horizon, the rest comes from the scan.
2. Click "Why did tx … fail?": transaction, plain-language explanation, then a fix plan.
3. Click "SCF contracts archived or expiring in 30d", ask to extend one, and approve the plan at the policy boundary (demo approval, nothing signed).
4. Click "Is … conformant?" to watch the nine-stage anchor probe.
5. Open `/findings`, filter, open a finding and send it to chat.

`DEMO.md` has the full three-minute recording script with fixed subjects.

## Deploying

The Vercel project's root directory is `apps/web`. Run `pnpm refresh:public` to copy the latest summary and trimmed findings into `data/public/`, set `HARNESS_DATA_DIR=../../data/public` and `ANTHROPIC_API_KEY` on the project, then deploy with `vercel deploy` from the repository root. Scan data is never committed.

## Swapping storage

The web app and the scanner read and write through the `Storage` interface in `packages/storage`. `createStorage({ dataDir })` picks `JsonFileStorage` when `data/summary.json` exists and `MemoryStorage` otherwise. `SqliteStorage` implements the same interface; moving to a database means returning it (or a new implementation) from that one factory.

## Decisions and progress

`DECISIONS.md` records every call made without explicit direction, each tagged `@decision`. `PROGRESS.md` records what is done, what is partial and the measured numbers.
