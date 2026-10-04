# Scanner

Measures operational failures across Stellar mainnet from public, read-only data and writes the numbers behind the report at https://stellarharness.xyz/report.

```bash
pnpm scan all --new-snapshot --window 1d   # anchors, contracts, rent, failures, github, report
pnpm report:publish                        # upload data/ to the report database
```

Settings live in `.env.example` next to this file.

## Method

Every census uses one snapshot: a ledger, its close time and the measured ledger close time, taken once per run. Each GET and RPC call is cached on disk, so a rerun with a warm cache makes no network calls. Nothing is signed or submitted; `simulateTransaction` is the only write-shaped call and it changes nothing.

Preventable result codes: op_underfunded, op_low_reserve, op_no_trust, op_no_destination, op_line_full, tx_bad_seq, tx_insufficient_fee, tx_too_late, tx_bad_auth. Path-payment price limits such as op_over_source_max and op_under_dest_min are not preventable by a pre-flight check.

The endpoints, parameters and run figures below are from the 2026-10-02 snapshot, ledger 64,723,488.

### Census 2: failed transactions

```text
POST https://mainnet.sorobanrpc.com getTransactions (limit 200, paged per 100-ledger chunk)
GET https://horizon.stellar.org/accounts/{id}
GET https://horizon.stellar.org/accounts/{id}/operations?order=asc&limit=1
```

| Parameter                                         | Value    |
| ------------------------------------------------- | -------- |
| window                                            | 86400    |
| start ledger                                      | 64706209 |
| end ledger                                        | 64723488 |
| rpc concurrency                                   | 8        |
| ledgers per second                                | 3.19     |
| transactions per second                           | 873.7    |
| cluster threshold tx_bad_seq, tx_insufficient_fee | 20       |
| cluster threshold other codes                     | 10       |

- Result codes are decoded from result_xdr and named exactly as Horizon names them.
- Transaction-level codes such as tx_bad_seq are rejected at submission and never reach ledger history, so their clusters are expected to be empty.
- byCode counts each code once per failed transaction.
- Run on 2026-10-02: 5446.2 s wall time, 24,780 requests, 24,848 network calls, 0 gaps.

### Census 1: contract state archival

```text
GET https://api.stellar.expert/explorer/public/contract?limit=200&order=desc (paged via _links.next)
GET https://api.stellar.expert/explorer/public/contract/{id} (invocations > 100 only)
POST https://mainnet.sorobanrpc.com getLedgerEntries (200 keys per call)
GET https://stellarlight.xyz/api/projects/search?scfAwarded=1
GET https://stellarlight.xyz/api/repos/search?minScore=0
```

| Parameter                          | Value    |
| ---------------------------------- | -------- |
| snapshot ledger                    | 64723488 |
| ledger close seconds               | 5        |
| expiring window 1 (days)           | 30       |
| expiring window 2 (days)           | 90       |
| unverified source invocation floor | 100      |
| rpc concurrency                    | 8        |
| contract limit                     | none     |

- An instance is archived when RPC does not return it or its liveUntilLedgerSeq is below the snapshot ledger.
- Hot-archived entries are returned with liveUntilLedgerSeq 0 and count as archived.
- Enumeration complete.
- Run on 2026-10-02: 1150.0 s wall time, 2,302 requests, 1,915 network calls, 0 gaps.

### Census 3: anchor conformance

```text
GET https://stellarlight.xyz/api/partners?type=anchor&all=1 and type=on-off-ramp
GET https://stellarlight.xyz/api/projects/search
GET https://medium.com/feed/stellar-community (SCF rounds 41 to 45)
GET https://api.stellar.expert/explorer/public/asset?sort=trustlines
GET https://{domain}/.well-known/stellar.toml
GET https://horizon.stellar.org/accounts/{id}
GET {TRANSFER_SERVER}/info, {TRANSFER_SERVER_SEP0024}/info, {ANCHOR_QUOTE_SERVER}/info, {DIRECT_PAYMENT_SERVER}/info
GET {WEB_AUTH_ENDPOINT}?account=<random public key>
@stellar/anchor-tests 0.6.22, read-only allowlist
```

| Parameter            | Value  |
| -------------------- | ------ |
| toml timeout (s)     | 15     |
| max redirects        | 3      |
| per-host concurrency | 2      |
| global concurrency   | 32     |
| scf source           | medium |
| domain limit         | none   |

- The funnel is cumulative: each step counts domains that passed every earlier step.
- anchor-tests that write to anchor servers (customer PUT/DELETE, deposit, withdraw, quote POST) and all of SEP-31 are excluded.
- Run on 2026-10-02: 640.3 s wall time, 1,067 requests, 140 network calls, 6 gaps.

### Census 4: rent

```text
POST https://mainnet.sorobanrpc.com simulateTransaction (extendFootprintTtl, read-only footprint of instance and code)
GET https://horizon.stellar.org/accounts/{simulation source}
GET https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd
```

| Parameter                   | Value    |
| --------------------------- | -------- |
| extend horizon (days)       | 365      |
| full population limit       | 5000     |
| sample size above the limit | 2000     |
| sample strata               | 10       |
| sample seed                 | 20261002 |
| live instances              | 89294    |
| simulated                   | 2000     |

- Rent is the minimum resource fee returned by simulation; nothing is signed or submitted.
- Totals sum simulated contracts only, with no population weighting.
- Run on 2026-10-02: 220.8 s wall time, 2,002 requests, 2,145 network calls, 0 gaps.

### Census 5: GitHub issues

- Skipped: GITHUB_TOKEN not set.
- Run on 2026-10-02: 0.0 s wall time, 0 requests, 0 network calls, 0 gaps.

### Limitations

- stellar.expert invocation counts are lifetime totals, so an active contract may be quiet today.
- A contract counts as archived when RPC does not return its instance or its liveUntilLedgerSeq is below the snapshot ledger.
- Anchor tests run only the read-only subset; tests that write customers, deposits, withdrawals or quotes on third-party servers, and all of SEP-31, are excluded.
- Rent is simulated for a seeded stratified sample of live contracts; totals are not weighted to the full population.
- stellar.expert has no page per wasm hash, so the report links a wasm hash to the first contract in its family.
- Horizon list records carry result_xdr rather than extras.result_codes, so codes are decoded from result_xdr.
