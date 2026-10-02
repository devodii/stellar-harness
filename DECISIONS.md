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
