# Stellar Harness

An operator agent for one organisation on Stellar. Think of it as a company card with rules: the company tells the harness which accounts, contracts and anchor it runs, and gives it a policy (how much it may spend a day, which operations it may perform, and above what cost the owner must approve). The harness watches those things, notices problems, simulates the fix to get its real cost, and proposes it as an action that is either within the policy or needs approval. In this demo the card is not live yet: every read and simulation is real, but nothing is signed or submitted, and the execute and approve buttons are disabled.

## Run it

```bash
pnpm install
cp .env.example .env                   # set OPENAI_API_KEY; OPENAI_MODEL defaults to gpt-4.1
docker compose up -d postgres          # pilot requests are stored here (DATABASE_URL)
pnpm dev                               # http://localhost:3000
pnpm --filter web storybook            # component catalogue
```

`pnpm build && pnpm lint && pnpm test` checks everything; `pnpm knip` and `pnpm depcheck` check for unused files, exports and dependencies. Every API route goes through `apiHandler` (validation, rate limits, error masking, request logging); migrations are plain SQL applied on first use.

## The demo organisation

`apps/web/demo-org.ts` describes Demo Treasury Ltd on testnet. It was created with the Stellar CLI (keys stay in the local CLI keystore and are not part of this repository):

```bash
stellar keys generate harness-treasury --network testnet --fund
stellar keys generate harness-distribution --network testnet --fund
stellar tx new change-trust --source harness-treasury --network testnet \
  --line USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
stellar tx new path-payment-strict-receive --source harness-treasury --network testnet \
  --send-asset native --send-max 1200000000 \
  --destination GDG4ULPBFQ4XF27ZUMQFJ7LSRPNMZLLCQDJWRV7PZZPEEQ7IGCHPQMK6 \
  --dest-asset USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 --dest-amount 1000000000
stellar contract init . --name increment    # lib.rs replaced with the soroban-examples increment contract
stellar contract build
stellar contract deploy --wasm target/wasm32v1-none/release/increment.wasm \
  --source harness-treasury --network testnet --alias harness-escrow
stellar contract deploy --wasm target/wasm32v1-none/release/increment.wasm \
  --source harness-treasury --network testnet --alias harness-registry
```

Treasury holds 100 testnet USDC; distribution has no USDC trustline, so a payment between them fails on `op_no_trust`. Escrow and Registry were deployed on 2026-10-02 and are never extended, so their days left are real and they archive on their own. The anchor is `testanchor.stellar.org`, SDF's testnet reference anchor.

## What is real and what is not

Real: every balance, trustline and TTL is read live from Horizon and Soroban RPC; every cost comes from RPC `simulateTransaction`; the anchor probe fetches the live `stellar.toml`, `/info` and a SEP-10 challenge, which it verifies without signing.

Not real: execution. Proposed actions are stored in memory and the execute and approve buttons are disabled; running them under the organisation's smart-account policy is the next phase.

## Layout

```
apps/web                Next.js app: one screen, the chat route and the pilot route
packages/agent          the eight tools the model can call and the system prompt
packages/stellar-tools  six read and simulate tools on @stellar/stellar-sdk
packages/storage        the organisation and proposed actions in memory, pilot requests in Postgres
packages/schema         Org, Action, Result and the env loader
packages/scanner        the network-wide census behind REPORT.md (run with pnpm scan)
apps/scan-cli           its command line
```

The network-wide numbers (archived contracts, failed transactions, anchor conformance across mainnet) come from `packages/scanner`, which writes `data/` and `REPORT.md`; see `packages/scanner/.env.example` for its settings. They are not part of the product screen.
