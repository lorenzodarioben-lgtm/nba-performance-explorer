# TASK-005 - Player Career Trends Chart

- **Milestone:** Career Trends Visualisation Slice
- **Status:** Implemented and verified; pending independent review
- **Branch:** `feature/career-trends-chart`

> Read `AGENTS.md`, `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`,
> `docs/PROJECT_STATE.md`, and `docs/DECISIONS.md` before starting. Stay strictly within this
> task. TASK-001 through TASK-004 are completed and merged; build on them without regressing
> search, profile, season statistics, or health behaviour.

## Goal

Add an accessible, responsive career-trends visualisation to the player profile.

For players with multiple fixture-backed seasons, users should see how their regular-season
**points per game**, **rebounds per game**, and **assists per game** changed across seasons.
The chart **supplements** accessible textual data; it must never be the only way to read the
values. This task introduces the first charting layer (Recharts, realising ADR-004) and must
not connect to a live NBA API.

## Required Behaviour

On `/players/:playerId`:

- The existing profile identity remains visible.
- The existing season selector and selected-season statistics remain visible and functional.
- Career-trend data loads independently of the profile and selected-season queries.
- Seasons appear chronologically, **oldest to newest**, along the chart.
- Points, rebounds, and assists are clearly distinguishable (not by colour alone).
- The chart updates correctly when the routed player changes.
- A user can understand the underlying values **without** relying on the SVG chart.
- A player with **fewer than two** seasons receives a clear, accessible insufficient-data
  state; a player with **no** season records receives a clear, accessible empty state.
- Loading and error states are accessible.
- Desktop and mobile layouts work.
- Existing search, profile, season-statistics, and health functionality remain working.

## Chart Scope

Visualise only **season**, **points per game**, **rebounds per game**, and **assists per
game**. Do **not** include game logs, per-game timelines, playoff data, shooting percentages,
advanced metrics, comparison, predictions, rankings, calculated insights, league averages, or
external data.

## Chart Type

A responsive multi-series line chart with three series (points, rebounds, assists):

- Seasons on the horizontal axis (oldest → newest), numeric averages on the vertical axis.
- A visible legend and a clear chart title.
- Tooltip (or equivalent pointer/focus detail) showing the season's values.
- A responsive container that resizes with its width.
- **Series must not be distinguishable by colour alone** — also use line style
  (e.g. solid/dashed/dotted via `strokeDasharray`), distinct point markers, and legend text.
- Preserve the exact fixture-backed season values; do not invent or smooth interpolated
  points beyond connecting the real season values.

The implementation-planning turn must verify the chosen library's accessibility and
responsive behaviour (see Dependency Policy and Risks).

## Dependency Policy

Recharts is **not currently installed** (absent from every workspace manifest and
`node_modules`). It may be introduced in TASK-005 **only after** the planning turn confirms
compatibility with the current React 19, TypeScript, Vite, Vitest/jsdom, bundle, and lint
setup. Do not install Recharts during the documentation or planning turns; install it only in
the implementation turn after that confirmation.

The planning turn must:

- Confirm Recharts is not already installed (it is not).
- Propose the exact workspace: the **frontend** workspace (it is a React rendering library;
  the backend only returns JSON and needs no charting dependency).
- Propose the exact install command (for example `npm install recharts --workspace frontend`)
  and the resolved version, confirming React 19 peer compatibility without forcing
  `--legacy-peer-deps`.
- Identify testing/rendering implications: Recharts' `ResponsiveContainer` measures its
  parent via layout APIs that jsdom does not implement, so the SVG may render with no size in
  Vitest. Frontend tests must therefore assert the **accessible table and the component
  states**, not SVG internals, and the plan must specify how the chart is made testable (for
  example a width-providing wrapper or a `ResizeObserver`/dimension shim in test setup) without
  weakening strict configuration.

Do **not** add any charting library in addition to Recharts.

## Backend Data Design

Add one focused, fixture-backed endpoint returning the complete oldest-first regular-season
dataset for one player, so the frontend does not request each season individually:

- **`GET /api/players/:playerId/season-trends`**

Semantics:

- Known player with multiple seasons → **200** with all season statistics, **oldest first**.
- Known player with one season → **200** with a single-entry array.
- Known player with no seasons → **200** with `{ "seasons": [] }`.
- Unknown player → structured **404** (`PLAYER_NOT_FOUND`).
- Invalid player id → structured **400** (`INVALID_PLAYER_ID`).
- Unsupported methods → structured **405**; unexpected failures → existing generic **500**.
- Season ids are unique and the outgoing payload is contract-validated before sending.
- Provider-private fields do not leak.
- The existing search, profile, season-list, selected-season-statistics, and health routes
  remain functional.

The route validates the player id, confirms the player exists via the existing `getPlayerById`
lookup (so unknown-player detection stays at the route layer), then returns the provider's
oldest-first stats.

## Shared Contracts

Define the minimum additional shared schema/type, reusing the existing strict
`PlayerSeasonStatsSchema`/`PlayerSeasonStats`:

- **`PlayerSeasonTrendsResponseSchema`** — `{ seasons: PlayerSeasonStats[] }`, strict, refined
  so the entries are **unique by season id** and in **strictly oldest-first (ascending start
  year)** order. Empty and one-entry arrays are valid.
- **`PlayerSeasonTrendsResponse`** — the inferred type.

Requirements:

- The response object is `.strict()`; unknown fields are rejected.
- Entries reuse the existing strict season-statistics schema (no new stat fields).
- Duplicate seasons are rejected; ordering is strictly oldest-first (the existing
  `PlayerSeasonsResponse` is newest-first — the trends refine is the opposite direction).
- No chart-library-specific or presentation fields (SVG, points, axes, colours) enter the
  shared/backend contracts.

## Fixture and Provider Boundary

Reuse the existing provider-private season fixtures (`season-fixtures.ts`); do **not** create
a second source of season-stat values. Extend the provider with one focused operation:

- `listPlayerSeasonStats(playerId: string): Promise<PlayerSeasonStats[]>`

Semantics:

- Returns all mapped season statistics for the player, **oldest first**, deterministically.
- Returns `[]` for a known player with no data.
- Does not mutate the fixture array (filter, then sort a copy).
- Does not silently hide duplicate malformed fixtures (the response contract detects a
  duplicate/ordering invariant violation).
- Unknown-player detection remains the route layer's responsibility via `getPlayerById`.
- Existing `searchPlayers`, `getPlayerById`, `listPlayerSeasons`, and `getPlayerSeasonStats`
  remain unchanged.

The existing season-statistics mapper (`mapFixtureSeasonStats`) should be reused directly;
only a new ascending (oldest-first) comparator is required (the existing season comparator is
descending for the newest-first season list).

## Backend Route Ordering

The new route is a two-segment path with a literal second segment `season-trends`. It must
coexist with `GET /` (search), `GET /:playerId` (profile), `GET /:playerId/seasons`,
`GET /:playerId/seasons/:season/stats`, the existing method-not-allowed handlers, and
`/api/health`. Use **specific-before-general** registration; register the trends route with the
other nested season routes, before the one-segment `/:playerId` profile route:

```
GET  /
ALL  /
GET  /:playerId/seasons
ALL  /:playerId/seasons
GET  /:playerId/seasons/:season/stats
ALL  /:playerId/seasons/:season/stats
GET  /:playerId/season-trends
ALL  /:playerId/season-trends
GET  /:playerId
ALL  /:playerId
```

Because Express matches whole path segments, `/:playerId/season-trends` (literal
`season-trends`) is not matched by `/:playerId/seasons` (literal `seasons`), nor by the
one-segment `/:playerId` or `ALL /:playerId` handlers. The planning turn must confirm this by
inspecting the router and proving it with route-ordering regression tests rather than assuming
it.

## Frontend API and Query Design

- A career-trends API client (`fetchPlayerSeasonTrends(playerId, signal)`) that reuses the
  shared API URL helper, encodes the player id, passes the `AbortSignal`, validates the
  success response with `PlayerSeasonTrendsResponseSchema`, and classifies failures into typed
  kinds (`invalid-id`, `player-not-found`, generic `error`). Reuse the existing
  `PlayerSeasonError` class where practical. Raw backend messages are never displayed; a
  contract-validation failure becomes a generic error.
- A TanStack Query hook `usePlayerSeasonTrendsQuery(playerId)` with key
  `["players", "season-trends", playerId]`, `enabled` only for a valid player id (no request
  otherwise), `retry: false`, the `AbortSignal` passed through, and **no** placeholder/previous
  data. The existing profile and selected-season queries remain independent.
- Keep all state local; no Redux, Zustand, or global chart state.

## Component Design

Create a focused child component (for example `PlayerCareerTrends`) and integrate it into the
**successful** player-profile view:

- The existing profile identity, season selector, and selected-season statistics remain
  visible and functional.
- Career trends appear as a **separate section below the season-statistics section**, with an
  `<h2>` (or appropriately nested heading) and **no second page-level `<h1>`**.
- Chart-fetching state stays inside this child component (not mixed into the identity/profile
  component). It receives the already-validated profile player id.

## Accessible Chart Fallback

The SVG chart alone is insufficient. Provide a semantic accessible representation of the same
data — a `<table>` (with caption and header row) containing **Season, Points per game,
Rebounds per game, Assists per game**:

- Every charted value appears in the accessible representation.
- Values use the **same deterministic formatting** as the chart/tooltips (one decimal place).
- The table must be usable by keyboard and screen-reader users; it may be visually displayed
  or behind an accessible disclosure, but its values must not be hidden from assistive
  technology. The decorative SVG should be hidden from assistive technology (or given a concise
  role/label) so the table is the accessible source of truth.
- Chart and table derive from the **same validated response** and must not disagree.

## Insufficient-Data Behaviour

- **No seasons** (empty array): show an accessible empty state; do **not** render an empty
  chart.
- **One season**: show an accessible message that at least two seasons are needed for a trend,
  and show that season's values textually; do **not** present a one-point line as a trend.
- **Two or more seasons**: render the line chart **and** the accessible table.

## Visual and Responsive Requirements

- The chart resizes with its container; no fixed width that causes mobile overflow.
- Axis and legend content remain readable at ~375px viewport width; avoid excessive chart
  height and tiny unreadable text; keep tooltip content within the viewport where practical.
- Do not rely on colour alone. Avoid animation that interferes with deterministic testing or
  accessibility, and honour reduced-motion preferences where the library supports a
  straightforward implementation.

## Formatting

Reuse the existing deterministic formatter (`formatPerGame`, one decimal place) for points,
rebounds, and assists in both the chart/tooltips and the accessible table. Do not use
locale-sensitive formatting in tests. Never display `NaN`, `Infinity`, `undefined`, or `null`.

## Tests

Use the existing Vitest, React Testing Library, jest-dom, jsdom, MSW, and Supertest setup. Do
not add a new testing framework.

### Backend

- Known player with multiple seasons returns all stats, **oldest-first**, no duplicate season
  ids, and passes `PlayerSeasonTrendsResponseSchema`.
- Known player with one season; known player with no seasons (`{ seasons: [] }`).
- Unknown player → 404; invalid player id → 400.
- Complete season-stat mapping; provider-private fields do not leak; payload limited to
  contract fields.
- The fixture source array is not mutated by repeated requests.
- Unsupported method → 405; structured errors; no stack traces.
- Route-ordering regression (the trends route is reachable and not shadowed by the season or
  profile routes).
- Existing profile, season-list, selected-season-statistics, search, and health endpoints
  still pass.

### Frontend

- The trends request uses the route player id.
- Loading state; multiple-season chart state; seasons ordered oldest-first.
- Points, rebounds, and assists series present; visible legend / series labels.
- Tooltip content where stable to test.
- The accessible table contains **every** plotted value, with the **same formatted values**
  as the chart.
- One-season insufficient-data state; no-season empty state.
- Unknown player; invalid player id (no request); generic server error; invalid-contract
  response.
- Existing profile identity, season selector, and selected-season statistics remain functional
  during chart states; back navigation and search-to-profile still work; existing health works.
- Responsive container structure; no duplicate page-level heading; `AbortSignal` propagation
  where stable; non-colour series distinction where reasonably testable.

Do not assert fragile internal SVG implementation details unless required for user-visible
behaviour.

## Acceptance Criteria

- [x] Known players can load fixture-backed career-trend data.
- [x] Trend data is ordered oldest first.
- [x] Duplicate seasons are rejected.
- [x] Points, rebounds, and assists are visualised.
- [x] Charted values match the backend response.
- [x] A visible legend identifies every series.
- [x] Series are distinguishable without relying only on colour.
- [x] The chart is responsive.
- [x] The chart does not overflow at mobile width.
- [x] An accessible textual or tabular equivalent is provided.
- [x] Every plotted value is available in the accessible representation.
- [x] A player with one season receives an insufficient-data state.
- [x] A player with no seasons receives an empty state.
- [x] Loading feedback is accessible.
- [x] Error feedback is accessible.
- [x] Invalid player IDs are handled without unnecessary requests.
- [x] Unknown players are handled clearly.
- [x] Shared contracts are used by frontend and backend.
- [x] Provider-private fields do not leak.
- [x] Existing player profile remains functional.
- [x] Existing season selection remains functional.
- [x] Existing selected-season statistics remain functional.
- [x] Existing search remains functional.
- [x] Existing health functionality remains functional.
- [x] Desktop and mobile layouts work.
- [x] No game logs, playoff data, comparison, or advanced metrics are introduced.
- [x] Formatting passes.
- [x] Lint passes.
- [x] Strict type checking passes.
- [x] Tests pass.
- [x] Production build passes.
- [x] Full validation passes.

## Explicitly Out of Scope

- Game logs and individual game charts.
- Playoff statistics and shooting-percentage trends.
- Advanced metrics, calculated insights, predictions, rankings, and league averages.
- Player comparison.
- Favourites and recently viewed players.
- Authentication.
- Live NBA API integration and deployment changes.
- Shareable chart configuration and exporting charts as images.
- External player images.
- Multiple charting libraries.
- Redux or Zustand.
- Unrelated redesign or refactoring.

## Definition of Done

- All acceptance criteria are implemented and verified.
- The complete git diff is reviewed.
- `docs/PROJECT_STATE.md` is updated with verified facts and the next action.
- Any new significant architecture decision is appended to `docs/DECISIONS.md` (introducing
  Recharts is already covered by ADR-004; a new ADR is only needed if the planning turn makes a
  genuinely new decision, for example pinning a specific Recharts major for React 19).
- No commit or push is made unless explicitly instructed.
