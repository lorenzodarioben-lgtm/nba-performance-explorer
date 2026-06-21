# TASK-006 - Player Game Log

- **Milestone:** Selected-Season Game Log Slice
- **Status:** Implemented and verified; awaiting independent review
- **Branch:** `feature/player-game-log`

> Read `AGENTS.md`, `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`,
> `docs/PROJECT_STATE.md`, and `docs/DECISIONS.md` before starting. Stay strictly within this
> task. TASK-001 through TASK-005 are completed and merged; build on them without regressing
> search, profile, season statistics, career trends, or health behaviour.

## Goal

Add a fixture-backed regular-season game log for the season currently selected on the player
profile. The game log is driven by the **existing** season selector — do not introduce a
second selector or a second source of season selection. It must not connect to a live NBA API.

A user opens a known player profile, selects an available season with the existing selector,
and sees that season's individual game records (newest first); changing the season loads that
season's games, with accessible loading, empty, unavailable-season, and error states. Existing
profile identity, season summaries, career-trends chart, search, and health functionality keep
working.

## User Experience

On `/players/:playerId`:

- Existing profile identity and metadata remain visible.
- The existing season selector remains the single source of season selection.
- Existing selected-season statistics remain functional.
- A game-log section appears **beneath the selected-season summary**, driven by the same
  effective selected season.
- Selecting another season loads that season's games; previous-season games do not remain
  visible under a newly selected season.
- Games appear newest first.
- A known season with no fixture games shows a clear accessible empty state; an unavailable
  season shows a clear accessible state; server/network/contract failures show an accessible
  generic error.
- Career trends remain independent and functional; desktop and mobile layouts work; back-to-
  search navigation remains available.

## Game-Log Scope

Display: **game date, team abbreviation, opponent abbreviation, home/away, win/loss, minutes,
points, rebounds, assists**. Do **not** add game-detail pages, box-score modals, play-by-play,
shot charts, shooting splits, playoff games, advanced metrics, comparison, insights,
predictions, rankings, league averages, live data, pagination, infinite scroll, sorting
controls, filtering, or export. The fixture dataset stays small, so pagination is out of scope.

## Public Game Identifier (decided)

A public game ID is an opaque, URL-safe string — **not** a private fixture array index.

- **`GameIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/)`** — non-empty; lowercase letters,
  digits, and hyphens; must start with a letter or digit (no leading hyphen); no whitespace, no
  `/`, no `.`, no path fragments. Example: `game-2024-04-14-lal-nop`.

The planning turn may tighten this (for example a maximum length) but must keep it URL-safe and
free of whitespace and path separators.

## Game Date (decided)

A date-only ISO string `YYYY-MM-DD`, kept as a string in shared contracts (no timezone
conversion for a date-only value).

- **`GameDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isRealCalendarDate)`** where
  `isRealCalendarDate` parses the year/month/day by **slicing** (index-safe under
  `noUncheckedIndexedAccess`) and verifies they round-trip through `Date.UTC(year, month - 1,
  day)` (compare `getUTCFullYear`/`getUTCMonth`/`getUTCDate`). `Date.UTC` is timezone-independent,
  so validation is deterministic.
- `2024-04-14` valid; `2024-02-29` valid (leap year); `2023-02-29` invalid; `2024-13-01` invalid;
  `04/14/2024` invalid (anchored regex); whitespace-padded values invalid (anchored regex).

## Shared Game Model (decided)

Define strict shared Zod schemas and inferred types in `packages/contracts`
(`player-game-log.ts`, re-exported from `index.ts`), reusing `SeasonIdSchema` and
`TeamSummarySchema`:

- `GameIdSchema` and `GameDateSchema` (above).
- `GameLocationSchema = z.enum(['home', 'away'])`.
- `GameResultSchema = z.enum(['W', 'L'])`.
- **`PlayerGameSchema`** (`.strict()`): `id` (`GameId`), `date` (`GameDate`), `team`
  (`TeamSummary`), `opponent` (`TeamSummary`), `location` (`GameLocation`), `result`
  (`GameResult`), and `minutes`/`points`/`rebounds`/`assists` (each `z.number().int().nonnegative()`).
- **`PlayerGameLogResponseSchema`** (`.strict()`): `season` (`SeasonId`) and `games`
  (`z.array(PlayerGameSchema)` with the ordering/uniqueness refine below).
- `PlayerGame` and `PlayerGameLogResponse` inferred types.

**Per-game season field — decided: omit it.** The response-level `season` identifies the
requested season and the provider only returns games for that season, so a per-game season field
would be redundant; it is not added.

Requirements: final objects strict; unknown fields rejected; no private fixture fields; no
presentation strings (no `"@ NOP"`, no `"28 PTS"`) in shared contracts; empty `games` arrays are
valid.

## Ordering and Uniqueness (decided)

`PlayerGameLogResponseSchema.games` is refined to enforce both, via a single iteration (a `Set`
of seen ids plus a stored previous date — no unchecked adjacent-array indexing):

- **Unique public game IDs** — a repeated `id` is rejected.
- **Strictly descending dates (newest first).** Because an NBA player ordinarily plays at most
  one game per date, the fixture model treats **same-day games as not permitted**: each game's
  date must be strictly earlier than the previous game's date. ISO `YYYY-MM-DD` strings compare
  lexicographically in chronological order, so ordering uses string comparison (no `Date`
  parsing, no timezone dependence). Strictly descending dates also guarantees unique dates.

The backend provider must also return deterministic newest-first results; the contract is the
enforcement boundary, not the frontend.

## Fixture Architecture

Create a separate provider-private game-fixture module (`backend/src/features/players/
game-fixtures.ts`). Do not embed game histories in player or season fixtures, and do not
duplicate player-identity or season-summary data per game. Private game records carry: public
player id, public game id, season id, date, team code, opponent code, home/away, win/loss,
minutes, points, rebounds, assists.

Author enough data to verify:

- A player and season with several games (for example LeBron `2544`, `2023-24`).
- A player with games in **multiple** seasons (LeBron also `2017-18`).
- A player and season with **exactly one** game (for example Wembanyama `1641705`, `2023-24`).
- A known player and a season that **exists in season statistics** but has **no game records**
  (for example LeBron `2018-19`) — this must return `[]`, distinct from an unknown season.
- At least one home game and one away game; at least one win and one loss.
- A valid **zero-valued** statistic (for example `0` assists or `0` rebounds in a low-minute
  game).
- **Deliberately unordered** fixture input for one player/season, so provider sorting is exercised.

Every team and opponent abbreviation must already exist in the shared team-fixture system
(`fixtureTeams`). The seasons used for games must already exist in the player's season fixtures
so the route's `SEASON_NOT_FOUND` logic remains correct. Fixture values may be illustrative but
must be internally consistent.

## Provider Boundary

Extend `PlayerProvider` with `listPlayerGames(playerId: string, season: string): Promise<PlayerGame[]>`:

- Returns all mapped game records for the player and season, **newest first**, deterministically.
- Returns `[]` for a known player and season with no game records.
- Filters a copy and sorts the copy — **does not mutate** the fixture array.
- Does not silently deduplicate malformed fixtures (the response contract surfaces a duplicate or
  ordering violation).
- Unknown-player and unknown-season detection remain the route layer's responsibility (via
  `getPlayerById` and `getPlayerSeasonStats`).
- Existing `searchPlayers`, `getPlayerById`, `listPlayerSeasons`, `getPlayerSeasonStats`, and
  `listPlayerSeasonStats` are unchanged.

**One focused mapper is sufficient:** a new `map-fixture-game.ts` (`mapFixtureGame`) maps a
private record to the public `PlayerGame` (copying only contract fields; the private `playerId`
and `season` are used for filtering, not returned).

## Unknown-Player and Unknown-Season Semantics

The route distinguishes (do **not** overload an empty array for unknown player/season):

- **Unknown player:** valid id, `getPlayerById` → `null` ⇒ structured **404 `PLAYER_NOT_FOUND`**.
- **Unknown season:** player exists, valid season, `getPlayerSeasonStats` → `null` ⇒ structured
  **404 `SEASON_NOT_FOUND`**.
- **Known player and season, no games:** player and season exist, `listPlayerGames` → `[]` ⇒
  **200** with an empty `games` array.

## Backend Endpoint

`GET /api/players/:playerId/seasons/:season/games`:

- Invalid player id → **400 `INVALID_PLAYER_ID`**; invalid season id → **400 `INVALID_SEASON_ID`**
  (reuse `parsePlayerIdParam` and `parseSeasonParam`; validate player id then season).
- Player existence then season existence as above (404s).
- Known player and season → **200** with `PlayerGameLogResponseSchema.parse({ season, games })`
  (newest first; empty array allowed).
- Unsupported methods → **405**; unexpected failures → existing generic **500** (no stack traces,
  no fixture/internal details). The outgoing payload is schema-validated before sending.

## Route Ordering

The current players router (after TASK-005) registers, in order: `GET/ALL /`,
`GET/ALL /:playerId/season-trends`, `GET/ALL /:playerId/seasons`,
`GET/ALL /:playerId/seasons/:season/stats`, `GET/ALL /:playerId`. The recommended insertion adds
the games routes **adjacent to the stats routes** (both are four-segment
`/:playerId/seasons/:season/...`), keeping the rest unchanged:

```
GET  /
ALL  /
GET  /:playerId/season-trends
ALL  /:playerId/season-trends
GET  /:playerId/seasons
ALL  /:playerId/seasons
GET  /:playerId/seasons/:season/games     <- NEW
ALL  /:playerId/seasons/:season/games
GET  /:playerId/seasons/:season/stats
ALL  /:playerId/seasons/:season/stats
GET  /:playerId
ALL  /:playerId
```

Because Express matches whole path segments, `/:playerId/seasons/:season/games` (literal last
segment `games`) cannot be intercepted by `/:playerId/seasons/:season/stats` (literal `stats`),
by `/:playerId/seasons` (two segments), or by `/:playerId` / `ALL /:playerId` (one segment); the
games and stats routes share a prefix but differ in the final literal, so their relative order is
immaterial. The planning turn must confirm against the actual router and prove it with
route-ordering regression tests (games reachable and not shadowed by the profile, season-list,
or selected-season routes, nor their `all(...)` handlers).

## Frontend Season-Selection Integration

Reuse the existing selector — **no second selector, no duplicate selection state, no global
state, no URL season parameter**. `PlayerSeasonStatistics` already derives the authoritative
`effectiveSeason` (chosen value reconciled against the available list). Render a focused child
`PlayerGameLog` **inside `PlayerSeasonStatistics`**, within the success branch that already shows
the selector and selected-season statistics (where `effectiveSeason` is a non-null member of the
list), after the statistics region:

```
<PlayerGameLog playerId={playerId} season={effectiveSeason} />
```

Consequences (all required behaviours fall out of this):

- The same `effectiveSeason` drives the selected-season statistics and the game log; changing the
  season re-renders both with the new season.
- The game log is only mounted when a valid `effectiveSeason` exists, so no request runs without a
  selected season, and a removed/unavailable season (reconciled away) never triggers a game-log
  request — the existing reconciliation stays authoritative.

The game-log section uses an `<h3>` ("Game log") subsection heading so the page keeps exactly one
`<h1>` (the player name) and the existing `<h2>`s ("Season statistics", "Career trends"). The
planning turn must inspect `PlayerSeasonStatistics` and choose the exact insertion point/heading
level (a nested section with its own `<h2>` is also acceptable provided a single page-level
`<h1>` is preserved).

## Frontend API and Query

- `season-game-log-api.ts` → `fetchPlayerGameLog(playerId, season, signal)`: reuse the shared API
  URL helper; encode both path segments; pass the `AbortSignal`; runtime-validate the success
  response with `PlayerGameLogResponseSchema`; return the parsed `{ season, games }`; map failures
  to typed kinds; never display raw backend messages; a contract-validation failure becomes a
  generic error.
- **Error type — reuse `PlayerSeasonError`.** Its kinds (`invalid-id`, `invalid-season`,
  `player-not-found`, `season-not-found`, `error`) exactly match the game-log endpoint's failures,
  so no new error class is needed (no circular import: the game-log client imports it the same way
  the trends client does).
- `usePlayerGameLogQuery(playerId, season)`: query key `["players", "game-log", playerId, season]`;
  `AbortSignal`; `retry: false`; **no placeholder/previous data**; enabled only when the player id
  is valid (`isValidPlayerId`) and the season is a valid `SeasonId` (`isValidSeasonId`). The season
  always comes from the current available-season list (the component only mounts with a valid
  `effectiveSeason`). Profile, season-statistics, and career-trends queries stay independent; no
  Redux/Zustand.

## Stale-Data Protection

When the user changes season: the new selector value stays visible; previous-season game rows
disappear immediately; an accessible loading state appears; and game rows render only when
`response.season === effectiveSeason`. Because the query key includes the season and no
placeholder/previous data is used, a re-keyed query yields `undefined` (loading) until the new
season resolves, so cached games for a prior key can never appear under a new season; the explicit
`response.season === effectiveSeason` guard reinforces this.

## Game-Log Component States

- **Loading** → `role="status" aria-live="polite"` (no stale rows).
- **Empty (`games: []`)** → `role="status"` message clearly stating no fixture-backed games are
  available for that season (wording distinct from the season-statistics and career-trends empty
  states); no empty table.
- **Unavailable season** (defensive `season-not-found`) → `role="alert"` clear message; no backend
  wording.
- **Generic error** → `role="alert"` generic message; profile and season summary remain visible.
- **Success** → semantic game-log table identifying the selected season, newest first.

(There is no "no selected season" state inside the component because the parent only mounts it with
a valid season; mounting it with a valid season is what prevents a request when no season exists.)

## Game-Log Presentation

An accessible semantic table inside an `overflow-x-auto` wrapper (mobile-safe; no page-level
horizontal overflow), with a `<caption>` identifying the season, `<thead>`/`<tbody>`,
`<th scope="col">` column headings, and a meaningful row header per game (the formatted date,
`<th scope="row">`). Columns: **Date, Matchup, Result, Minutes, Points, Rebounds, Assists**
(full-text headers; if compact labels such as `MIN`/`PTS`/`REB`/`AST` are used the full meaning
must remain accessible). Win/loss is shown as **visible text** (for example `W`/`L` under the
`Result` column, optionally with visually-hidden `Win`/`Loss`) — never colour alone, and not
reliant on colour. No `undefined`/`null`/`NaN`/fabricated values; integer stats render directly
(`0` renders as `0`).

## Date Formatting (decided)

The frontend uses a **deterministic, locale-independent, timezone-safe** formatter that parses the
ISO string manually — never `new Date("2024-04-14")` with local formatting. Recommended:
`formatGameDate("2024-04-14") → "14 Apr 2024"` using a fixed month-abbreviation array indexed by
the parsed month (handle the index safely under `noUncheckedIndexedAccess`). Displaying the ISO
string directly is an acceptable simpler alternative; either way tests stay locale-independent.

## Matchup Formatting (decided)

A pure formatter `formatMatchup(location, opponentAbbreviation)`: `home` → `vs NOP`, `away` →
`@ NOP`. It accepts only the two `GameLocation` values (the enum type enforces this) and never
fabricates an opponent. The composed string is **not** stored in shared contracts.

## Tests

Use the existing Vitest, React Testing Library, jest-dom, jsdom, MSW, and Supertest setup; no new
testing framework.

### Backend (`game-log-router.test.ts`)

Several-game season (200, newest-first, unique ids, complete mapping, home + away matchups, win +
loss, zero-valued statistic); one-game response; known player/season with no games (`{ season,
games: [] }`); unknown player (404 `PLAYER_NOT_FOUND`); unknown season (404 `SEASON_NOT_FOUND`);
invalid player id (400) and invalid season id (400); shared response-contract compliance;
real-date validation accept + invalid-calendar-date reject (focused contract guard, including
duplicate-id and reversed-order rejection); no provider-private fields leak and payload limited to
contract fields; fixture source not mutated (snapshot before/after); 405; structured errors with no
stack traces; route-ordering regression (games not intercepted by profile/season-list/stats or
their `all` handlers); and existing profile, trends, season-list, selected-season-statistics,
search, and health endpoints still pass.

### Frontend (`PlayerGameLog.test.tsx`)

Request uses the routed player id and the effective selected season; **no request without a
selected season** (empty seasons ⇒ the game log is not mounted ⇒ no request); loading state;
successful table; **newest-first** order; selected season identified; **home** (`vs NOP`) and
**away** (`@ NOP`) matchup formatting; **win** and **loss** text; minutes/points/rebounds/assists,
including a **zero** value; empty state; unavailable-season state; generic server error;
invalid-contract response; **changing season requests the new game log**; **previous-season games
disappear during loading**; **returned `response.season` must match the effective season before
rendering**; **reconciliation prevents a request for a removed season**; the existing selector
remains the only selector; selected-season statistics and career trends remain functional; profile
identity remains visible; back navigation and search-to-profile still work; health still works;
semantic table structure; mobile-safe overflow wrapper; exactly one page-level `<h1>`; `AbortSignal`
propagation where stable. Do not assert private React state or implementation details. (Because the
game log is nested under the season selector, these tests render the full profile with profile,
season-list, selected-season-statistics, and trends MSW handlers plus the game-log handler.)

## Existing-Test Maintenance

After integration, tests that render a **successful selected season** (the season section with the
selector and statistics) will also mount the game log and issue a game-log request — this is
`PlayerSeasonStatistics.test.tsx` (its tests use non-empty season lists). Add a minimal MSW handler
that echoes the requested season with an empty list, for example
`http.get('http://localhost/api/players/:playerId/seasons/:season/games', ({ params }) =>
HttpResponse.json({ season: String(params.season), games: [] }))`, so the game log shows its empty
state. `PlayerProfilePage.test.tsx`, `PlayerSearch.test.tsx`, and `PlayerCareerTrends.test.tsx`
default to **empty** season lists, so the game log is not mounted and they need no game-log handler.
Do not weaken existing assertions, do not globally suppress unhandled requests, and do not add a
fake second selector.

## Dependencies

**No new dependency.** Zod, TanStack Query, React Router, MSW, Vitest, RTL, Supertest, and Express
are sufficient. Do not install a date library, a table library, or a state-management package. If a
package appears genuinely required, stop and request approval.

## Acceptance Criteria

- [x] Known players can load fixture-backed games for a selected season.
- [x] The existing season selector controls the game log.
- [x] No duplicate season selector is introduced.
- [x] Games are ordered newest first.
- [x] Duplicate game IDs are rejected.
- [x] Game dates are valid ISO calendar dates.
- [x] Team and opponent abbreviations render correctly.
- [x] Home and away matchups render correctly.
- [x] Win and loss results render as text.
- [x] Minutes, points, rebounds, and assists render correctly.
- [x] Zero-valued statistics render correctly.
- [x] A known season with no fixture games receives an accessible empty state.
- [x] Unknown players are handled clearly.
- [x] Unknown seasons are handled clearly.
- [x] Invalid player IDs return structured errors.
- [x] Invalid season IDs return structured errors.
- [x] Loading feedback is accessible.
- [x] Error feedback is accessible.
- [x] Previous-season games are not shown under a new season.
- [x] Shared contracts are used by frontend and backend.
- [x] Provider-private fields do not leak.
- [x] Existing selected-season statistics remain functional.
- [x] Existing career trends remain functional.
- [x] Existing profile functionality remains working.
- [x] Existing search remains working.
- [x] Existing health functionality remains working.
- [x] Desktop and mobile layouts work.
- [x] No game-detail page, playoff data, pagination, or advanced metrics are introduced.
- [x] Formatting passes.
- [x] Lint passes.
- [x] Strict type checking passes.
- [x] Tests pass.
- [x] Production build passes.
- [x] Full validation passes.

## Explicitly Out of Scope

- Game-detail routes, play-by-play, shot charts, shooting splits, playoff games.
- Pagination, infinite scrolling, user sorting/filtering, exporting data.
- Advanced metrics, player comparison, calculated insights, predictions, rankings, league averages.
- Favourites, recently viewed players, authentication.
- Live NBA API integration, deployment, external player images.
- New state-management libraries, unrelated redesign or refactoring.

## Definition of Done

- All acceptance criteria are implemented and verified.
- The complete git diff is reviewed.
- `docs/PROJECT_STATE.md` is updated with verified facts and the next action.
- Any new significant architecture decision is appended to `docs/DECISIONS.md` (none is expected;
  the game log follows ADR-001/002/007 and the existing nested REST design).
- No commit or push is made unless explicitly instructed.
