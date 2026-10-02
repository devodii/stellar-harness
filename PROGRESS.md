# Progress

Resume here: read this file and `DECISIONS.md` first.

## Status

| Milestone | State |
| --- | --- |
| M0 workspace, schema, storage | Done. `pnpm install && pnpm build && pnpm lint && pnpm test` pass; `docker compose build` passes for both images. |
| M1 network core, Census 2 | Done. Decoder checked against all 208 of Horizon's result code mappings. |
| M2 Census 3 anchors | Done. Full domain list probed. |
| M3 Census 1 contracts, Census 4 rent | Done. Full enumeration and TTL reads. |
| M4 GitHub, report, CLI | Done. GitHub census is implemented and skipped until `GITHUB_TOKEN` is set. |
| M5 tools and agent | Done. All 12 tools exposed to the agent; `planFix` produces a valid plan for every finding type. |
| M6 web app | Done. Builds clean; renders without scan data; chat needs `ANTHROPIC_API_KEY`. The approve and decline round trip has not been exercised against a real model yet. |
| M7 polish | Done: README, DEMO.md, Vercel config, `pnpm refresh:public`. |

## Next steps

1. Set `ANTHROPIC_API_KEY` in `apps/web/.env.local`, run `pnpm dev`, and click through the six suggestions; adjust the system prompt if any workflow stops early.
2. Set `GITHUB_TOKEN` and run `pnpm scan github && pnpm scan report` to fill Census 5.
3. Optionally run `pnpm scan failures --window 7d` (about 120,000 RPC calls, five to six hours on the public endpoint) for the full window.

## Measured: full run

Snapshot ledger 64,723,488 at 2026-10-02T01:07:02Z, measured ledger close 5.0 s.

| Census | Wall time (s) | Requests | Network calls | Cache hits | Gaps |
| --- | ---: | ---: | ---: | ---: | ---: |
| anchors (rerun) | 640.3 | 1,067 | 140 | 959 | 6 |
| contracts | 1,150.0 | 2,302 | 1,915 | 518 | 0 |
| rent | 220.8 | 2,002 | 2,145 | 2 | 0 |
| failures (1 day) | 5,446.2 | 24,780 | 24,848 | 8 | 0 |
| github | skipped | | | | |

- Network calls can exceed requests because retries count as network calls.
- Failures throughput: 3.19 ledgers/s and 874 transactions/s at RPC concurrency 8. The brief's 10 minute target for one day is not reachable on the public RPC (one `getTransactions` call covers about 1.08 ledgers).
- Warm cache reruns of contracts and rent made zero network calls.
- Cache size after the run: 9.0 GB in `data/cache`, 644 MB in `data/derived`. `data/public` is 5.2 MB.

## Headline figures (from REPORT.md)

| Metric | Value |
| --- | ---: |
| Contracts enumerated | 154,434 |
| Wasm families | 3,779 |
| Contract instances archived | 65,140 |
| Expiring within 30 days | 45,050 (41,147 from one mass-deployed wasm family of 124,585) |
| Expiring within 31 to 90 days | 29,523 |
| SCF-funded contracts archived / expiring within 30 days | 13 / 24 |
| Transactions scanned (1 day) | 4,729,762 |
| Failed | 988,544 (20.9%) |
| Failed with a preventable code | 101,363 (10.3% of failed) |
| Top preventable codes | op_underfunded 67,202, op_no_trust 28,866, op_low_reserve 4,618, op_line_full 899, op_no_destination 331, tx_bad_auth 1 |
| Failure clusters | 533 (429 op_underfunded, 55 op_low_reserve, 38 op_no_trust, 7 op_no_destination, 4 op_line_full) |
| Anchor domains tested | 202 |
| Anchor funnel | toml 68, signing key 26, endpoints 21, /info 19, SEP-10 10, all anchor tests 0 |
| 12-month rent, 2,000 sampled live instances | 56,979 XLM total, 21.54 XLM median (XLM/USD 0.2187) |
| Findings | 145,260 |
