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
