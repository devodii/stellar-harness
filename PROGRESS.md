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

`pnpm build`, `pnpm lint`, `pnpm test`, the Storybook tests, `pnpm knip` and `pnpm depcheck` pass.

## Deleted in patch 02

- Web features: the findings explorer and drawer, `/about`, the live strip, the chat list and local storage history, plans and handoffs, the connect sheet, the theme toggle and dark theme, the network picker, image attachments, and every component that only served them (timeline, data table, swipe to reply, json view, page header, stat tiles and the rest).
- API routes: `findings`, `summary`, `live`, `network`, `waitlist`.
- Tools: `getTransaction`, `explainFailure`, `queryFindings`, `getSummary`, `searchEcosystem`, `planFix`, `getNetworkStatus`, and the old `stellar-tools` internals (now owned by the scanner).
- Schema and storage: findings, summaries, snapshots, plans, JSON file and SQLite storage, the old Postgres findings store and its import scripts.
- Repo: `scripts/`, the scanner and web Dockerfiles, Vercel config, the root tsconfig, the testnet scan path.

## Kept

The engineering kit stays: `apiHandler` with validation, rate limits and error masking on every route; the validated env loader; the pino logger; `fetchJson` and `Result` on the client; `memo` and `ttlCache`; the core shadcn primitives (select, input, button, checkbox, dialog, sheet, drawer, tooltip, popover, command and the rest); the RHF and Zod form fields with `useZodForm`; the responsive sheet; the AI Elements the chat uses; Storybook with a story for every component.

## The screen

```
apps/web/demo-org.ts                          the demo organisation: accounts, contracts, anchor, policy
apps/web/app/page.tsx                         the one screen: header, watched panel, chat
apps/web/app/layout.tsx                       fonts and providers
apps/web/app/api/chat/route.ts                streams the model with the eight tools, through apiHandler
apps/web/app/api/pilot/route.ts               stores a pilot request in Postgres, through apiHandler
apps/web/lib/harness.ts                       server singletons and cached live reads for the watched panel
apps/web/lib/db.ts                            Postgres client, migrated on first use
apps/web/lib/pilot.ts                         client call for a pilot request, returning a Result
apps/web/components/header.tsx                wordmark, organisation and network, policy hint, pilot sheet
apps/web/components/watch-panel.tsx           accounts, contracts, anchor and proposed actions
apps/web/components/action-card.tsx           a proposed action with disabled execute and approve
apps/web/components/chat.tsx                  suggestions, messages and the composer
apps/web/components/chat-suggestions.tsx      the four suggestions
apps/web/components/chat-composer.tsx         the prompt input
apps/web/components/tool-call.tsx             tool call header, status and result
apps/web/components/tool-results.tsx          account, ttl, preflight and anchor renderers
apps/web/components/pilot-sheet.tsx           request a pilot: responsive sheet and form
packages/agent/src/index.ts                   the eight AI SDK tools and the system prompt
packages/agent/src/org.ts                     label resolution, policy check and proposeAction
packages/stellar-tools/src/*.ts               the six tools: account, contract ttl, simulate, anchor, preflight, clients
packages/storage/src/index.ts                 Storage and MemoryStorage
packages/storage/src/pg.ts                    Postgres client and migration runner
packages/storage/src/migrations.ts            SQL migrations
packages/storage/src/pilot.ts                 pilot requests
packages/schema/src/*.ts                      Org and Action, Result and AppError, defineEnv
```

Shared kit: `apps/web/components/{ui,ai-elements,forms}`, `apps/web/components/{address,copy-button,bracket-tag,hint,inline-alert,key-value-list,stat,tool-error-row,wordmark,responsive-sheet}.tsx`, `apps/web/hooks`, `apps/web/lib/{api-handler,env,log,http,memo,rate-limit,format,links,tone}.ts`.

## Next step

Make execution real: give the organisation a smart account whose policy matches `Org.policy`, connect it through Stellar Wallets Kit agent mode, and turn the disabled execute and approve buttons into a signed submission within policy and an owner approval above it. Until then, extend Escrow and Registry on testnet before they archive if the demo needs them live, or keep them as the archived case.
