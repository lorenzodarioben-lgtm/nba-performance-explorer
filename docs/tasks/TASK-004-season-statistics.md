# TASK-004 - Player Season Statistics

- **Milestone:** Season Statistics Vertical Slice
- **Status:** Completed and merged (commit `8ce4fa5`, merged into `main` via pull request #4 in merge commit `1c08394`)
- **Branch:** `feature/season-statistics`

> Read `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`,
> `docs/PROJECT_STATE.md`, and `docs/DECISIONS.md` before starting. Stay strictly within
> this task. TASK-001, TASK-002, and TASK-003 are completed and merged; build on them
> without regressing search, profile, or health behaviour.

## Goal

Extend the fixture-backed player profile at `/players/:playerId` with regular-season
statistical summaries and an accessible season selector.

A user on a known player profile should see the player's available fixture-backed seasons
(newest first, latest selected by default), be able to select another available season, and
view that season's regular-season averages, with accessible loading, empty, not-found, and
error feedback. Player search, profile information, and the health check must keep working.

This task introduces **season summaries only**. It must not introduce charts, trend lines,
or game logs, and it must not connect to a live NBA API.

## Required Behaviour

On `/players/:playerId`, in addition to the existing profile:

- The existing profile identity and metadata remain visible.
- Available seasons load from the backend.
- Seasons are ordered newest first.
- The newest available season is selected by default.
- A clearly labelled native season `<select>` is used.
- Selecting another season loads that season's statistics.
- The currently displayed season is unambiguous (the selected season is shown alongside its
  statistics).
- Previous-season statistics must not be presented as belonging to a newly selected season
  while that season's request is loading (show the loading state instead).
- A player with no season data receives a clear, accessible empty state.
- An unavailable/unknown season receives a clear, accessible state.
- Server, network, or contract failures receive a generic, accessible error state.
- The interface works at desktop and mobile widths.
- Back-to-search navigation continues working.

## Statistical Scope

Display these regular-season statistics for the selected season:

- Season
- Team abbreviation
- Games played
- Minutes per game
- Points per game
- Rebounds per game
- Assists per game
- Steals per game
- Blocks per game
- Turnovers per game
- Field-goal percentage
- Three-point percentage
- Free-throw percentage

Do not add playoff statistics, game-by-game logs, charts, trend lines, advanced metrics,
comparison calculations, predictions, rankings, league averages, or any external data.

## Approved Data Representation

### Season identifier

A string of the form `2023-24`:

- Four-digit starting year, a hyphen, then a two-digit ending year.
- No surrounding whitespace and no arbitrary free-form labels.
- **Minimum validation rule:** equivalent in responsibility to `^\d{4}-\d{2}$`.
- The implementation-planning turn may decide whether the schema should additionally
  validate that the ending year follows the starting year (for example `2023-24` valid,
  `2023-26` invalid). The minimum regex above is mandatory; the consecutive-year refinement
  is an approved-but-optional planning decision.

### Counting statistics

- `gamesPlayed`: a non-negative integer.
- Do not invent games-started or season-total fields in this task.

### Per-game averages

Finite, non-negative numbers stored as numbers (not formatted strings):

- `minutesPerGame`, `pointsPerGame`, `reboundsPerGame`, `assistsPerGame`, `stealsPerGame`,
  `blocksPerGame`, `turnoversPerGame`.

The frontend normally displays these to one decimal place.

### Shooting percentages

Numeric ratios in `0..1` inclusive (not strings):

- `fieldGoalPercentage`, `threePointPercentage`, `freeThrowPercentage`.

Example: `0.542` displays as `54.2%`. Do not store percentages as strings such as `"54.2%"`.

### Team

Each season summary includes the team abbreviation for that statistical season. Reuse the
existing shared `TeamSummary` contract for the abbreviation rather than redefining it. (A
player may have different team abbreviations across seasons.)

## Shared Contracts

Define strict shared Zod schemas and inferred TypeScript types in `packages/contracts` (new
file, for example `packages/contracts/src/player-season.ts`, re-exported from `index.ts`).
Reuse existing contracts (`TeamSummarySchema`, `PlayerIdSchema`) where appropriate. Import
the same schemas in both applications; do not duplicate them.

Required responsibilities (suggested names, final names may follow repository conventions):

- **`SeasonIdSchema`** — the season identifier rule above. Exported so the backend route
  validator and any frontend gating reuse one rule (mirrors `PlayerIdSchema`).
- **`PlayerSeasonSchema`** — one available season entry: `season` (`SeasonId`) and `team`
  (`TeamSummary`). Strict.
- **`PlayerSeasonsResponseSchema`** — `{ seasons: PlayerSeason[] }`, strict, refined so that
  the season ids are **unique** and in **strictly descending (newest-first) order**. This
  makes ordering and de-duplication a contract invariant.
- **`PlayerSeasonStatsSchema`** — `season` (`SeasonId`), `team` (`TeamSummary`),
  `gamesPlayed` (non-negative integer), the seven per-game averages (finite, non-negative),
  and the three shooting percentages (finite, `0..1`). Strict.
- **`PlayerSeasonStatsResponseSchema`** — `{ stats: PlayerSeasonStats }`, strict.

Requirements:

- Final object schemas are `.strict()` (reapplied explicitly on any composed schema) and
  reject unknown fields.
- Numeric values are validated as finite (reject `NaN`/`Infinity`) and correctly bounded
  (counts and per-game values non-negative; percentages within `0..1`).
- Season responses cannot contain duplicate season ids and have deterministic newest-first
  ordering.
- Do not add game-log, chart, comparison, or advanced-stat contracts.

## Backend Fixture Boundary

Extend the private fixture system coherently. Season fixture records remain
provider-private (their raw shape must never be returned to clients).

- Add a provider-private season dataset (for example
  `backend/src/features/players/season-fixtures.ts`) keyed by the existing private player id
  (`sourceId`). Each private season record carries the per-season raw values and its team
  code; map it to the shared domain models in the provider/mapper layer.
- Do not duplicate full player identity/profile information in every season record. Resolve
  the team abbreviation per season (reuse the existing private team metadata where it helps).
- Include enough data to verify:
  - A player with multiple seasons (and at least one player whose team abbreviation differs
    across seasons).
  - A player with exactly one season.
  - A player with no season data.
  - Realistic decimal averages and at least one valid zero-valued statistic.
  - Newest-first ordering.
  - An unknown-season request against a known player.
- Fixture values may be illustrative but must be internally consistent.
- Do not connect a live NBA API.

## Provider Boundary

Extend the existing `PlayerProvider` with focused operations (exact signatures decided in the
planning turn), responsible for:

- Listing a player's available seasons (newest first).
- Retrieving statistics for one player and one season.

Candidate signatures:

- `listPlayerSeasons(playerId: string): Promise<PlayerSeason[] | null>`
- `getPlayerSeasonStats(playerId: string, season: string): Promise<PlayerSeasonStats | null>`

Required behaviour:

- An **unknown player** is distinguishable from a **known player with no season data** (for
  example `listPlayerSeasons` returns `null` for an unknown player and `[]` for a known
  player with no seasons).
- An **unknown season** for a known player is distinguishable from an unknown player (for
  example the stats route confirms the player exists — reusing existing player lookup — and
  then treats a missing season for a known player as a season-not-found case).
- Provider-private fixture fields do not leak.
- Existing `searchPlayers` and `getPlayerById` behaviour is unchanged.

## Backend API Design

Add two nested, per-player endpoints (do **not** add a single endpoint returning every
player's complete statistical history):

1. `GET /api/players/:playerId/seasons` — list available seasons.
2. `GET /api/players/:playerId/seasons/:season/stats` — statistics for one season.

Validation and semantics:

- `:playerId` is validated with the shared `PlayerIdSchema`; invalid syntax → structured
  **400** (`INVALID_PLAYER_ID`).
- `:season` is validated with the shared `SeasonIdSchema`; invalid syntax → structured
  **400** (suggested `INVALID_SEASON_ID`).
- Seasons list:
  - Unknown player → structured **404** (`PLAYER_NOT_FOUND`).
  - Known player with no seasons → **200** with `{ seasons: [] }` (the empty state is a
    frontend concern, not an error).
  - Known player with seasons → **200** with a newest-first `PlayerSeasonsResponse`.
- Season stats:
  - Unknown player → structured **404** (`PLAYER_NOT_FOUND`).
  - Known player, unknown season → structured **404** (suggested `SEASON_NOT_FOUND`).
  - Known player and known season → **200** with a `PlayerSeasonStatsResponse`.
- Unsupported methods on either route → structured **405** (existing
  `methodNotAllowedHandler`).
- Unexpected failures → generic structured **500** (existing error handler); no stack traces
  and no provider-private details in any response.
- Successful outgoing payloads are validated with the relevant response schema before they
  are sent.

### Route ordering

The players router (mounted at `/api/players`) currently registers, in order: `GET /`
(search), `ALL /` (405), `GET /:playerId` (profile), `ALL /:playerId` (405). Append the
season routes after these:

- `GET /:playerId/seasons`, `ALL /:playerId/seasons`
- `GET /:playerId/seasons/:season/stats`, `ALL /:playerId/seasons/:season/stats`

Because `:playerId` matches a single path segment, `/:playerId` and `/:playerId` `ALL`
handlers do not match the two- and four-segment season paths, so the new routes do not shadow
search (`GET /`), the profile route (`GET /:playerId`), or the existing 405 handlers, and
`/api/health` is unaffected. The planning turn must confirm this ordering by inspecting and
testing the actual Express behaviour rather than assuming it.

## Frontend Data Flow

- Add an available-seasons API client and a selected-season-statistics API client (for
  example in a `frontend/src/features/players/` season module) that reuse the shared API URL
  helper, request the routes above, pass the request `AbortSignal` to `fetch`, runtime-
  validate successful responses with the shared schemas, and classify failures into typed
  kinds (`invalid-id`/`invalid-season` → 400, `not-found` → 404, otherwise generic; a
  contract-validation failure becomes the generic error). Raw backend messages are never
  shown to users.
- Add TanStack Query hooks with deterministic keys (confirm final keys in planning):
  - seasons: `["players", "seasons", playerId]`
  - season stats: `["players", "season-stats", playerId, season]`
  - Both use `retry: false` (deterministic 400/404), pass the `AbortSignal`, and are enabled
    only for a syntactically valid player id (and, for stats, a selected season that is a
    member of the available list).
- Keep the selected season in **local React state** only. Do not introduce Redux or Zustand
  and do not add unrelated global state.

## Season-Selection Behaviour

Use an accessible native `<select>` (no custom combobox) with:

- A visible label and an accessible name.
- The selector disabled while season options are unavailable (loading/empty/error) where
  appropriate.
- The latest available season selected initially.
- The user's selection retained while its stats request is loading.
- Old statistics never mislabelled as the newly selected season (because the stats query is
  keyed by season and previous data is not reused as a placeholder, switching seasons shows
  the loading state until the new season resolves).
- No request issued for an invalid or absent season.

The documentation-defined behaviour when the available-seasons response changes and the
currently selected season no longer exists: the component must reconcile by resetting the
selection to the newest available season (and must never request a season that is not in the
current available list). Initial selection follows the same rule (default to newest once
seasons load).

## Statistical Presentation

Use semantic, responsive markup within the profile page:

- A clearly labelled season-statistics `<section>` with a section heading.
- The season `<select>`, plus the selected season and team abbreviation shown unambiguously.
- A semantic stat grid (a description list or equivalent) with clearly labelled values for
  the statistics in **Statistical Scope**.
- Accessible loading, empty, and error states for the statistics region (status/alert roles
  with clear text).

Accessibility of labels: compact visible labels may be used, but the full meaning of each
statistic must remain available to assistive technology (for example a full-text `<dt>`
label, or a visible compact label paired with visually-hidden full text). Do not rely on
bare abbreviations such as `PPG` without accessible explanatory text, and do not convey state
through colour alone.

## Formatting Requirements

Add focused, pure formatting utilities (for example extending the existing
`frontend/src/features/players/format.ts`) and unit-test them:

- Per-game value → one decimal place (for example `27` → `27.0`).
- Ratio → percentage string with one decimal place (for example `0.542` → `54.2%`).
- Season display (the canonical `2023-24` identifier; centralised for consistency).

Formatting must be deterministic and locale-independent (prefer fixed-decimal formatting such
as `toFixed(1)` over locale-sensitive APIs to avoid environment-dependent test failures),
must never display `NaN` or `Infinity`, and must never fabricate fallback statistics.

## Tests

Use the existing Vitest, React Testing Library, jest-dom, jsdom, MSW, and Supertest setup. Do
not add a new testing framework or dependency.

### Backend

- Known player season list returns 200 and passes `PlayerSeasonsResponseSchema`.
- Seasons are newest-first with no duplicate season ids.
- Known player with exactly one season.
- Known player with no seasons returns 200 with an empty list.
- Unknown player returns a structured 404.
- Invalid player id returns a structured 400.
- Known player and known season returns 200 stats that pass
  `PlayerSeasonStatsResponseSchema`.
- Unknown season for a known player returns a structured 404.
- Invalid season syntax returns a structured 400.
- Team abbreviation maps correctly.
- `gamesPlayed` integer validation holds.
- Per-game statistics map correctly.
- Percentage ratios map correctly (`0..1`).
- Zero-valued statistics are supported.
- Provider-private fields do not leak; payloads carry only contract fields.
- Unsupported methods return a structured 405.
- Error responses use the shared structured contracts and do not expose stack traces.
- Existing profile, search, and health endpoints still pass.

### Frontend

- Available seasons are requested for the route player.
- The latest season is selected by default.
- Seasons are listed newest first.
- The season selector has an accessible name.
- Changing the selection requests the selected season (observable via the request/query key).
- Old statistics are not displayed as the newly selected season while it loads.
- Accessible loading, empty (no seasons), and error states render.
- Successful statistics render with team abbreviation, one-decimal per-game values, and
  percentage formatting, including zero-valued statistics.
- A player with one season and a player with no seasons both render correctly.
- Unknown-player / unknown-season / invalid-id / generic-server-error / invalid-contract
  responses are handled accessibly.
- Back navigation remains functional and existing profile content remains visible.
- The existing player-search flow and health functionality remain functional.
- Responsive semantic structure is verifiable (for example a single stats heading and a
  semantic stat list).

Do not test internal React implementation details.

## Acceptance Criteria

- [x] Known players can load their available fixture-backed seasons.
- [x] Available seasons are ordered newest first.
- [x] The newest season is selected by default.
- [x] Users can choose another available season.
- [x] Selected-season statistics load from the backend.
- [x] The displayed season and statistics always correspond.
- [x] Shared contracts are used by frontend and backend.
- [x] Provider-private season fields do not leak.
- [x] Invalid player IDs return structured errors.
- [x] Invalid season IDs return structured errors.
- [x] Unknown players and unknown seasons are handled clearly.
- [x] Players with no season data receive an accessible empty state.
- [x] Loading feedback is accessible.
- [x] Error feedback is accessible.
- [x] Games played renders correctly.
- [x] Per-game averages render to one decimal place.
- [x] Shooting percentages render correctly.
- [x] Zero-valued statistics render as valid values.
- [x] Existing player profile functionality remains working.
- [x] Existing player search remains working.
- [x] Existing health functionality remains working.
- [x] Desktop and mobile layouts work.
- [x] Formatting passes.
- [x] Lint passes.
- [x] Strict type checking passes.
- [x] Tests pass.
- [x] Production build passes.
- [x] Full validation passes.

## Explicitly Out of Scope

- Charts or graphing libraries (do not install Recharts during this task).
- Game logs and individual game details.
- Playoff statistics.
- Player comparison.
- Advanced metrics and calculated insights.
- League rankings and league averages.
- Predictions.
- Favourites.
- Recently viewed players.
- Authentication.
- Live NBA API integration.
- Deployment changes.
- Shareable season URLs.
- External player images.
- New state-management libraries.
- Unrelated redesign or refactoring.

## Definition of Done

- All acceptance criteria are implemented and verified.
- The complete git diff is reviewed.
- `docs/PROJECT_STATE.md` is updated with verified facts and the next action.
- Any new significant architecture decision is appended to `docs/DECISIONS.md`.
- No commit or push is made unless explicitly instructed.
