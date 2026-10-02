# Progress

Resume here: read this file and `DECISIONS.md` first.

## Status

| Milestone              | State                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| M0 to M7 scanner       | Done. Five censuses, `REPORT.md`, 843 tests. Kept as-is for the public report; now self-contained in `packages/scanner`.     |
| M9 delete              | Done. See below.                                                                                                             |
| M10 organisation model | Done. `Org`, `Action`, in-memory storage, eight agent tools, demo organisation on testnet.                                   |
| M11 one screen         | Done. Header, watched panel with live numbers, chat with four suggestions and four result renderers, action cards, pilot.    |
| M12 wire and document  | Done. Three chips end in action cards against the live organisation; the anchor chip reports a passing anchor (see DEMO.md). |

`pnpm build`, `pnpm lint`, `pnpm test`, `pnpm knip` and `pnpm depcheck` pass.

## Deleted in patch 02

- Web: the findings explorer and drawer, `/about`, the live strip, the chat list and local storage history, plans and handoffs, the connect sheet and waitlist, the theme toggle and dark theme, the network picker, image attachments, every result renderer except four, Storybook and every story, the web unit tests, 24 shadcn components and 11 AI Elements components.
- API routes: `findings`, `summary`, `live`, `network`, `waitlist`.
- Tools: `getTransaction`, `explainFailure`, `queryFindings`, `getSummary`, `searchEcosystem`, `planFix`, `getNetworkStatus`, and the old `stellar-tools` internals (now owned by the scanner).
- Agent: the provider switch, the old system prompt and the tool envelope adapters.
- Schema and storage: findings, summaries, snapshots, plans, the waitlist, JSON file, SQLite and Postgres storage, migrations.
- Repo: `scripts/` (public data refresh, Postgres import, migrate, action refresh), Docker and compose files, Vercel config, the root tsconfig, the testnet scan path.

## What remains

```
apps/web/demo-org.ts                          the demo organisation: accounts, contracts, anchor, policy
apps/web/app/layout.tsx                       fonts and the tooltip provider
apps/web/app/page.tsx                         the one screen: header, watched panel, chat
apps/web/app/globals.css                      design tokens, light only
apps/web/app/api/chat/route.ts                streams the model with the eight tools
apps/web/app/api/pilot/route.ts               appends a pilot request to data/pilot.jsonl and returns the count
apps/web/lib/harness.ts                       server singletons and cached live reads for the watched panel
apps/web/lib/format.ts                        truncateId and formatXlm
apps/web/components/header.tsx                name, organisation and network, policy chip, pilot link
apps/web/components/watch-panel.tsx           accounts, contracts, anchor and proposed actions
apps/web/components/action-card.tsx           a proposed action with disabled execute and approve
apps/web/components/chat.tsx                  suggestions, messages and the composer
apps/web/components/tool-results.tsx          tool call header and the account, ttl, preflight and anchor renderers
apps/web/components/pilot-sheet.tsx           the request a pilot sheet and form
apps/web/components/copy-id.tsx               truncated id with copy
apps/web/components/ai-elements/conversation.tsx  scrolling message log
apps/web/components/ai-elements/message.tsx   message layout and markdown response
apps/web/components/ai-elements/tool.tsx      collapsible tool call
apps/web/components/ui/button.tsx             button
apps/web/components/ui/input.tsx              input
apps/web/components/ui/sheet.tsx              side sheet
apps/web/components/ui/tooltip.tsx            tooltip
packages/agent/src/index.ts                   the eight AI SDK tools and the system prompt
packages/agent/src/org.ts                     label resolution, policy check and proposeAction
packages/agent/src/org.test.ts                proposeAction and policy tests
packages/stellar-tools/src/clients.ts         Horizon, RPC and fetch clients per network
packages/stellar-tools/src/account.ts         getAccount
packages/stellar-tools/src/contract-ttl.ts    getContractTtl
packages/stellar-tools/src/simulate.ts        simulateExtendTtl and simulateRestore
packages/stellar-tools/src/anchor.ts          probeAnchor
packages/stellar-tools/src/preflight.ts       buildPaymentPreflight and the result code table
packages/stellar-tools/src/index.ts           exports
packages/stellar-tools/src/tools.test.ts      tests for the six tools
packages/storage/src/index.ts                 Storage and MemoryStorage
packages/schema/src/index.ts                  Org and Action
```

35 source files, plus each package's `package.json` and `tsconfig.json`.

## Next step

Make execution real: give the organisation a smart account whose policy matches `Org.policy`, connect it through Stellar Wallets Kit agent mode, and turn the disabled execute and approve buttons into a signed submission within policy and an owner approval above it. Until then, extend Escrow and Registry on testnet before they archive if the demo needs them live, or keep them as the archived case.
