# TASK-008 — Live NBA Data Provider Integration

- **Milestone:** Live NBA Data Provider Integration
- **Status:** Completed and merged
- **Branch:** `feature/live-nba-provider`
- **Selected provider:** Direct NBA.com Stats access through `NbaStatsPlayerProvider`
- **Risk posture:** Accepted product-owner legal, stability, and deployment-connectivity risks

> Read `AGENTS.md`, `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`,
> `docs/PROJECT_STATE.md`, and `docs/DECISIONS.md` before implementation. TASK-001
> through TASK-007 are completed and merged. This document is the final TASK-008
> implementation specification. The planning decisions below are implemented and merged into
> `main` via pull request #9 (see "Implementation Result").

## Objective

Replace fixture-backed runtime NBA data with direct, server-side NBA.com Stats data while
preserving the established backend provider boundary, public routes, shareable NBA.com player
IDs, frontend query architecture, deterministic fixture mode, structured errors, accessibility,
and offline CI.

The live implementation is named `NbaStatsPlayerProvider`. It uses Node.js 22 built-in `fetch`
from the existing Express backend. It does not use Python, the `nba_api` package at runtime, a
sidecar, a proxy, IP rotation, WAF bypassing, or another blocking-evasion technique.

## Accepted-Risk Provider Decision

The project owner deliberately accepts the following risks because direct NBA.com Stats access is
the strongest technical match for this low-traffic portfolio project:

- NBA.com Stats is undocumented and unsupported as a public API.
- NBA.com terms may restrict this type of public statistics application and written permission
  may be required for a comprehensive, regularly updated public statistics database.
- NBA.com may alter, block, rate-limit, or remove endpoints without notice.
- Local connectivity does not guarantee connectivity from a deployment provider.
- Shared cloud-hosting IP ranges may receive timeouts or access-denied responses.
- The application must provide prominent NBA.com attribution and state that it is unofficial and
  unaffiliated with the NBA.

These risks do not authorize circumvention. If the intended deployment environment cannot reach
NBA.com reliably, production enablement stops. Fixture mode remains available for offline
demonstrations.

## Verified Starting State

- Branch `feature/live-nba-provider` points to `1a49c24`.
- TASK-001 through TASK-007 are complete and merged into `main`.
- The merged baseline passes 214 tests: 135 frontend and 79 backend.
- Runtime data remains fixture-backed behind `PlayerProvider`.
- `createApp()` mounts `createPlayersRouter()`, which already accepts a `PlayerProvider`.
- NBA.com IDs already used by the application remain valid:
  - Stephen Curry: `201939`
  - LeBron James: `2544`
- Bounded direct Node.js 22 validation succeeded locally for `commonplayerinfo`,
  `playercareerstats`, and `playergamelog`.
- No credential is required for NBA.com Stats.

## Final Architecture

```text
Browser
  -> existing /api routes
  -> Express players router
  -> PlayerProvider
       -> FixturePlayerProvider       (tests, CI, offline development)
       -> NbaStatsPlayerProvider      (explicit live mode)
            -> local search directory
            -> NBA Stats HTTP client
            -> private response validation and mapping
            -> bounded in-memory LRU cache
            -> https://stats.nba.com/stats
```

Responsibilities:

- `server.ts` parses runtime configuration and constructs the selected provider once.
- `createApp(provider)` injects the provider into `createPlayersRouter(provider)`.
- Routes remain provider-agnostic.
- `NbaStatsPlayerProvider` implements the existing `PlayerProvider` methods.
- Provider-private schemas, result-set parsing, headers, caching, and error normalization remain
  inside the backend.
- Frontend components continue to consume shared public contracts only.
- Automated tests never call NBA.com.

## Runtime Configuration

### `NBA_DATA_PROVIDER`

Allowed values:

```text
fixture
nba-stats
```

Rules:

- Outside production, `fixture` is the default when the variable is absent.
- Tests and CI explicitly use `fixture`.
- When `NODE_ENV=production`, an absent `NBA_DATA_PROVIDER` is a startup configuration error.
- Production must explicitly set `NBA_DATA_PROVIDER=nba-stats`; explicitly selecting `fixture`
  in production is also a startup configuration error.
- Any other value throws a configuration error before the server starts listening.
- A configured `nba-stats` provider never falls back silently to fixture data after an upstream
  failure.

### `NBA_STATS_TIMEOUT_MS`

- Default: `10000`.
- Parse as a positive integer.
- Accepted range: `1000` through `30000`.
- Invalid values fail during startup.
- It is used only by the live provider.

No API key or other credential is required. No NBA.com configuration belongs in a `VITE_`
variable.

## Approved Upstream Sources And Parameters

Base URL:

```text
https://stats.nba.com/stats
```

Only the following sources are approved for TASK-008. Do not add `LeagueDashPlayerStats` unless
implementation proves that one of the required public contracts cannot be fulfilled by these
four sources and the scope change is approved first.

### `commonallplayers`

Purpose:

- Build the live player directory.
- Supply NBA.com person IDs, names, roster status, career-year range, and current team summary
  where NBA.com provides one.
- Support local two-character, first-name, surname, and full-name search without one upstream
  request per keystroke.

Parameters:

```text
LeagueID=00
Season=<current NBA season in YYYY-YY form>
IsOnlyCurrentSeason=0
```

Resolve the current NBA season from an injected clock so tests are deterministic:

- October through December: season starts in the current calendar year.
- January through September: season starts in the previous calendar year.
- Format the result as `YYYY-YY`.

Required result set: `CommonAllPlayers`.

Required columns:

```text
PERSON_ID
DISPLAY_LAST_COMMA_FIRST
DISPLAY_FIRST_LAST
ROSTERSTATUS
FROM_YEAR
TO_YEAR
PLAYERCODE
PLAYER_SLUG
TEAM_ID
TEAM_CITY
TEAM_NAME
TEAM_ABBREVIATION
TEAM_CODE
TEAM_SLUG
GAMES_PLAYED_FLAG
OTHERLEAGUE_EXPERIENCE_CH
```

### `commonplayerinfo`

Purpose:

- Player profile.
- Current team, position, jersey, height, weight, country, and draft information.
- Honest inactive-player, retired-player, and free-agent detection from roster/team fields.

Parameters:

```text
PlayerID=<NBA.com person ID>
LeagueID=00
```

Required result sets:

- `CommonPlayerInfo`: exactly one row for a known player.
- `AvailableSeasons`: may be validated but is not the source of public season statistics.

Required `CommonPlayerInfo` columns:

```text
PERSON_ID
FIRST_NAME
LAST_NAME
DISPLAY_FIRST_LAST
BIRTHDATE
SCHOOL
COUNTRY
HEIGHT
WEIGHT
SEASON_EXP
JERSEY
POSITION
ROSTERSTATUS
TEAM_ID
TEAM_NAME
TEAM_ABBREVIATION
TEAM_CODE
TEAM_CITY
FROM_YEAR
TO_YEAR
NBA_FLAG
GAMES_PLAYED_FLAG
DRAFT_YEAR
DRAFT_ROUND
DRAFT_NUMBER
```

Required `AvailableSeasons` column:

```text
SEASON_ID
```

### `playercareerstats`

Purpose:

- Available seasons.
- Selected regular-season statistics.
- Complete career trends.
- Existing two-player common-season comparison.

Parameters:

```text
PlayerID=<NBA.com person ID>
PerMode=PerGame
LeagueID=00
```

Required result set: `SeasonTotalsRegularSeason`.

Required columns:

```text
PLAYER_ID
SEASON_ID
LEAGUE_ID
TEAM_ID
TEAM_ABBREVIATION
PLAYER_AGE
GP
GS
MIN
FGM
FGA
FG_PCT
FG3M
FG3A
FG3_PCT
FTM
FTA
FT_PCT
OREB
DREB
REB
AST
STL
BLK
TOV
PF
PTS
```

Ignore postseason, All-Star, college, showcase, ranking, high, and career-total result sets for
TASK-008.

### `playergamelog`

Purpose:

- Selected-season regular-season game log.

Parameters:

```text
PlayerID=<NBA.com person ID>
Season=<YYYY-YY>
SeasonType=Regular Season
DateFrom=
DateTo=
LeagueID=00
```

Required result set: `PlayerGameLog`.

Required columns:

```text
SEASON_ID
Player_ID
Game_ID
GAME_DATE
MATCHUP
WL
MIN
REB
AST
PTS
```

The response may contain additional box-score columns. They remain provider-private.

## Private Upstream Validation

Add `zod` as a direct backend runtime dependency. The contracts workspace's transitive
installation is not an acceptable declaration for backend-private schemas.

The HTTP response envelope must contain:

```text
resultSets: Array<{
  name: string
  headers: string[]
  rowSet: unknown[][]
}>
```

Validation rules:

- Require the endpoint-specific result-set names above.
- Reject duplicate result-set names.
- Reject missing or duplicate required columns.
- Require every row width to equal its result set's header width.
- Validate and map each consumed cell by column name and expected runtime type.
- Allow unused result sets and additional future columns so harmless NBA.com additions do not
  break the provider.
- Reject HTML, non-JSON bodies, missing result sets, malformed rows, non-finite numbers, and
  schema drift as `PROVIDER_INVALID_RESPONSE`.
- Never expose raw result sets outside the backend provider layer.

## HTTP Client

Use Node.js 22 built-in `fetch`, `URL`, and `URLSearchParams`.

Application-controlled headers:

```text
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36
  (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36
Accept: application/json, text/plain, */*
Accept-Language: en-US,en;q=0.5
Referer: https://www.nba.com/
Pragma: no-cache
Cache-Control: no-cache
Sec-CH-UA: "Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"
```

Do not manually set `Host`, `Content-Length`, `Accept-Encoding`, or connection-management
headers; Node manages them. Keep the `User-Agent` and `Sec-CH-UA` Chromium versions consistent if
the validated header set is updated later.

Request rules:

- Abort after `NBA_STATS_TIMEOUT_MS` using an `AbortController`.
- Check HTTP status and content type before JSON parsing.
- Do not establish a cookie session or persist `Set-Cookie` values unless a later approved
  investigation proves it necessary. Bounded validation succeeded without a cookie preflight.
- Do not retry timeout, HTTP 403, HTTP 429, ordinary upstream 4xx, upstream 5xx, invalid JSON,
  HTML, or schema-invalid responses.
- TASK-008 performs zero automatic retries. This avoids amplifying NBA.com blocking and keeps
  latency bounded.
- Log only provider name, operation, duration, status category, cache result, player ID, and
  season. Do not log raw URLs, response bodies, cookies, or request/response headers.

## Mapping To `PlayerProvider`

### `searchPlayers(searchTerm, limit)`

Source: cached `commonallplayers`.

Algorithm:

1. Trim and collapse whitespace.
2. Remove diacritics with Unicode NFD normalization.
3. Compare case-insensitively against normalized full name, first name, and surname.
4. Preserve the existing two-character minimum enforced by the route.
5. Rank deterministically:
   1. exact full-name match;
   2. exact first-name or surname match;
   3. full-name prefix;
   4. first-name or surname prefix;
   5. word-boundary substring;
   6. general substring.
6. Within one rank, order active players before inactive players, then full name, then numeric
   player ID.
7. De-duplicate by `PERSON_ID`.
8. Return no more than the supplied limit, which remains eight in the route.

Map:

- `id` from `PERSON_ID`, stringified without numeric coercion in public lookup code.
- `fullName` from `DISPLAY_FIRST_LAST`.
- `team` only when `TEAM_ID` is positive and the abbreviation is a valid three-letter code.
- Position is not available in `commonallplayers`; omit it rather than making one profile request
  per search result.

### `getPlayerById(playerId)`

Source: cached `commonplayerinfo`.

Map:

- Identity from `PERSON_ID` and display-name fields.
- `team` only when the team ID and required team fields are present.
- `position` and `jerseyNumber` only when non-empty.
- Parse NBA height such as `6-2` to total inches.
- Parse whole-number weight pounds.
- `country` only when non-empty.
- `draft` only when year, round, and number are all positive integers. Treat `Undrafted`,
  empty, and unavailable values as absent.
- A syntactically valid unknown player with no `CommonPlayerInfo` row returns `null`.

### `listPlayerSeasons(playerId)`

Source: the same cached `playercareerstats` response used by all career operations.

- Use only `SeasonTotalsRegularSeason`.
- Group rows by `SEASON_ID`.
- Order unique seasons newest first.
- For a single-team season, include that team abbreviation.
- For a multi-team season, omit `team`; do not expose `TOT` as a team.

### `getPlayerSeasonStats(playerId, season)`

Source: cached `playercareerstats`.

- Select regular-season rows for the requested `SEASON_ID`.
- If there is one team row, map it directly.
- If there are multiple team rows, select the aggregate row where `TEAM_ID` is zero or
  `TEAM_ABBREVIATION` is `TOT`.
- If multiple team rows have no unique aggregate row, classify the response as invalid rather
  than inventing an aggregate.
- Omit public `team` for an aggregate row; `TOT` is not a real team.
- Map:
  - `GP` -> `gamesPlayed`
  - `MIN` -> `minutesPerGame`
  - `PTS` -> `pointsPerGame`
  - `REB` -> `reboundsPerGame`
  - `AST` -> `assistsPerGame`
  - `STL` -> `stealsPerGame`
  - `BLK` -> `blocksPerGame`
  - `TOV` -> `turnoversPerGame`
  - `FG_PCT` -> `fieldGoalPercentage`
  - `FG3_PCT` -> `threePointPercentage`
  - `FT_PCT` -> `freeThrowPercentage`
- NBA.com already supplies percentages as ratios from zero through one.
- No matching season returns `null`.

### `listPlayerSeasonStats(playerId)`

Source: one cached `playercareerstats` response.

- Apply the selected-season mapping to every unique regular season.
- Return strictly oldest first, as required by the career-trends contract.
- Do not issue one upstream request per season.

### `listPlayerGames(playerId, season)`

Source: cached `playergamelog`.

- `Game_ID` -> public lowercase-safe game ID. NBA game IDs are decimal digits and already satisfy
  the public game-ID format.
- Parse `GAME_DATE` to `YYYY-MM-DD` without locale-dependent output.
- Accept the observed `MMM DD, YYYY` shape with an explicit English month lookup and Gregorian
  date validation; do not rely on platform date-string parsing.
- Parse `MATCHUP`:
  - `GSW vs. LAL` means home;
  - `GSW @ LAL` means away.
- The left abbreviation is the player's team and the right abbreviation is the opponent.
- `WL` must be `W` or `L`.
- Map `MIN`, `PTS`, `REB`, and `AST` to non-negative integers.
- Sort strictly newest first and reject duplicate game IDs.
- A known season with no games returns an empty array.

### Two-player comparison

No provider method or backend route is added. Existing frontend comparison remains composed from:

- profiles;
- available seasons;
- selected-season statistics.

Both players' season operations reuse their individual cached career responses.

## Shared Contract Decision

A small backward-compatible public contract widening is necessary to represent NBA.com data
honestly:

```text
PlayerSummary.team?: TeamSummary
PlayerProfile.team?: TeamProfile
PlayerSeason.team?: TeamSummary
PlayerSeasonStats.team?: TeamSummary
```

Reasons:

- Free agents, inactive players, and retired players may have no current team.
- Traded-season aggregate rows use `TOT`, which is not a real team.
- Fabricating a last-known or arbitrary team would mislabel data.

Game-log `team` and `opponent` remain required because `MATCHUP` supplies both.

Frontend compatibility changes are required:

- Search result without a team: show `No current team`.
- Profile without a team: show `No current team`.
- Multi-team season summary/statistics/comparison: show `Multiple teams`.
- Existing fixture records continue to include teams and retain their current output.

No `PlayerProvider` interface signature changes are required.

## Cache Design

Implement a backend-private process-local LRU cache with:

- Maximum 500 settled entries.
- LRU promotion on successful reads.
- TTL checked on every read.
- A separate in-flight promise map keyed identically to settled entries.
- Concurrent callers for one key await the same promise.
- Successful empty values cached for 60 seconds.
- Errors never cached.
- Failed in-flight entries removed immediately.
- Fixture and NBA.com namespaces kept separate.
- A test-only fresh-cache factory; no shared mutable singleton between tests.

Keys and TTLs:

| Data | Key | TTL |
|---|---|---:|
| Player directory | `nba-stats:directory:<season>` | 24 hours |
| Player profile | `nba-stats:profile:<playerId>` | 6 hours |
| Career stats, active player | `nba-stats:career:<playerId>` | 6 hours |
| Career stats, inactive player | same key | 7 days |
| Current-season game log | `nba-stats:games:<playerId>:<season>` | 5 minutes |
| Historical game log | same key form | 7 days |
| Valid empty response | operation key | 60 seconds |

The cache is deliberately process-local for TASK-008. Restarts, cold starts, and multiple
instances do not share entries and may multiply upstream requests. A shared cache requires a
separate approved task.

## Error Design

Provider-private error categories:

```text
PROVIDER_TIMEOUT
PROVIDER_UNAVAILABLE
PROVIDER_INVALID_RESPONSE
```

HTTP mapping:

| Condition | Status | Public code |
|---|---:|---|
| Timeout/abort | 504 | `PROVIDER_TIMEOUT` |
| HTTP 403 or 429 | 503 | `PROVIDER_UNAVAILABLE` |
| Upstream 5xx or network failure | 503 | `PROVIDER_UNAVAILABLE` |
| Invalid JSON, HTML, unexpected content type, missing columns, or schema drift | 502 | `PROVIDER_INVALID_RESPONSE` |
| Unknown player | 404 | Existing `PLAYER_NOT_FOUND` |
| Unknown season | 404 | Existing `SEASON_NOT_FOUND` |

Public messages remain generic. Raw NBA.com text, HTML, URLs, cookies, headers, stack traces, and
provider implementation details are never returned to clients.

## Fixture, Test, And CI Policy

- Existing exported test application remains fixture-backed.
- Tests that need another provider call `createApp(provider)` directly.
- `NBA_DATA_PROVIDER` is not required by frontend or backend tests.
- CI explicitly sets or relies on fixture mode and has no NBA.com network dependency.
- No automated test may call NBA.com.
- Fixture data remains deterministic and available for offline demonstrations.
- Live-mode upstream failure never switches to fixture data.

## Complete Test Inventory

### Configuration and construction

- Default provider is `fixture`.
- Explicit fixture mode.
- Explicit `nba-stats` mode.
- Missing provider outside production defaults to fixture.
- Missing provider in production fails startup.
- Explicit fixture mode in production fails startup.
- Invalid provider value.
- Default timeout.
- Minimum/maximum timeout boundaries.
- Invalid timeout values.
- Provider is parsed and constructed once before listening.

### Result-set validation and HTTP

- Required result-set name present.
- Missing and duplicate result-set names.
- Missing and duplicate required headers.
- Row width mismatch.
- Additional unused result sets and columns are accepted.
- Browser-compatible application headers are sent.
- Node-managed headers are not manually set.
- Query parameters are encoded exactly.
- Timeout abort.
- HTTP 403.
- HTTP 429.
- Upstream 5xx.
- Network rejection.
- HTML response.
- Unexpected content type.
- Malformed JSON.
- Schema-invalid JSON.
- No raw upstream data leaks into errors or logs.

### Search

- Two-character search.
- First-name exact and prefix search.
- Surname exact and prefix search.
- Full-name exact and prefix search.
- General substring search.
- Case, repeated whitespace, and accent normalization.
- Exact/prefix ranking before substring ranking.
- Active player tie-break.
- Alphabetical and numeric-ID deterministic tie-breaks.
- Duplicate player removal.
- Maximum eight results.
- Missing current team.
- One upstream directory fetch across multiple searches.
- Current-season calculation at the September/October boundary.

### Profile

- Complete active-player mapping.
- Current team mapping.
- Position and jersey mapping.
- Height and weight parsing.
- Country and draft mapping.
- Undrafted player.
- Inactive player.
- Retired player/free agent with no team.
- Unknown player.
- Empty optional fields are omitted.

### Seasons and statistics

- Unique newest-first available seasons.
- Single-team season.
- Multi-team season summary omits team.
- Unique `TOT`/zero-team aggregate selected.
- Multi-team season without an aggregate is rejected.
- Regular-season result set only.
- Every `PlayerSeasonStats` field.
- Percentage ratios.
- Zero and null edge cases.
- Selected missing season.
- Career trends strictly oldest first.
- One career fetch reused by seasons, selected stats, and trends.

### Game log

- Game ID and date mapping.
- `vs.` home matchup.
- `@` away matchup.
- Team and opponent extraction.
- Win and loss.
- Minutes, points, rebounds, and assists.
- Newest-first sorting.
- Duplicate game IDs rejected.
- Valid empty game log.
- Malformed matchup rejected.

### Cache

- Cache miss and hit.
- TTL expiry.
- LRU promotion and eviction at the entry limit.
- Successful empty-result TTL.
- Errors not cached.
- In-flight request de-duplication.
- Failed in-flight cleanup.
- Current versus historical game-log TTL.
- Fresh isolated cache per test.

### Regression

- Existing fixture provider tests.
- Existing route and structured-error tests.
- Optional-team shared-contract tests.
- Search, profile, season, trends, game-log, and comparison UI fallbacks.
- Full existing frontend and backend suites.

## Exact Files To Create

```text
backend/src/config/player-provider-config.ts
backend/src/config/player-provider-config.test.ts
backend/src/features/players/player-provider-factory.ts
backend/src/features/players/player-provider-factory.test.ts
backend/src/features/players/provider-error.ts
backend/src/features/players/nba-stats/nba-stats-cache.ts
backend/src/features/players/nba-stats/nba-stats-cache.test.ts
backend/src/features/players/nba-stats/nba-stats-http-client.ts
backend/src/features/players/nba-stats/nba-stats-http-client.test.ts
backend/src/features/players/nba-stats/nba-stats-response.ts
backend/src/features/players/nba-stats/nba-stats-response.test.ts
backend/src/features/players/nba-stats/nba-stats-mappers.ts
backend/src/features/players/nba-stats/nba-stats-mappers.test.ts
backend/src/features/players/nba-stats/nba-stats-search.ts
backend/src/features/players/nba-stats/nba-stats-search.test.ts
backend/src/features/players/nba-stats/nba-stats-player-provider.ts
backend/src/features/players/nba-stats/nba-stats-player-provider.test.ts
```

## Exact Files To Modify

```text
backend/src/app.ts
backend/src/server.ts
backend/src/middleware/errors.ts
backend/package.json
backend/.env.example
package-lock.json
packages/contracts/src/player-search.ts
packages/contracts/src/player-profile.ts
packages/contracts/src/player-season.ts
frontend/src/features/player-search/PlayerCombobox.tsx
frontend/src/features/player-search/PlayerSearch.test.tsx
frontend/src/features/players/PlayerProfilePage.tsx
frontend/src/features/players/PlayerProfilePage.test.tsx
frontend/src/features/players/PlayerSeasonStatistics.tsx
frontend/src/features/players/PlayerSeasonStatistics.test.tsx
frontend/src/features/player-comparison/PlayerComparisonTable.tsx
frontend/src/features/player-comparison/PlayerComparisonPage.test.tsx
backend/src/features/players/players-router.test.ts
backend/src/features/players/season-router.test.ts
backend/src/features/players/season-trends-router.test.ts
docs/DECISIONS.md
docs/PROJECT_STATE.md
docs/tasks/TASK-008-live-nba-provider.md
README.md
```

No files are planned for deletion.

## Dependencies

Add exactly one direct runtime dependency:

```text
backend: zod
```

Use the same compatible Zod version already selected by the contracts workspace. Do not add
Axios, Python, `nba_api`, a cache package, a retry package, or a logging framework.

## Ordered Implementation Sequence

1. Reconfirm branch, clean tree, task status, and approved plan.
2. Make team fields optional in shared player/profile/season contracts and add contract tests.
3. Add frontend `No current team` and `Multiple teams` handling with regression tests.
4. Add direct backend `zod` dependency and update the lockfile.
5. Implement and test provider configuration parsing.
6. Implement and test provider-private errors and stable middleware mapping.
7. Implement and test the bounded LRU/in-flight cache.
8. Implement and test the NBA Stats HTTP client, headers, timeout, status handling, and JSON
   boundary.
9. Implement and test generic result-set validation and endpoint-specific required columns.
10. Implement and test local player-directory normalization, ranking, and mapping.
11. Implement and test profile, career, traded-season, and game-log mappers.
12. Implement and test `NbaStatsPlayerProvider`.
13. Implement the provider factory and inject it through the server composition root.
14. Run targeted backend and frontend tests.
15. Run formatting, lint, strict type checking, all tests, production build, and full validation.
16. Perform bounded local live verification without saving raw responses.
17. Perform the deployment-connectivity gate before production live mode is enabled.
18. Update TASK-008 results, PROJECT_STATE, README, and ADR consequences with verified outcomes.
19. Review the complete diff. Commit and push only after explicit instruction.

## Validation Commands

From the repository root:

```powershell
npm.cmd run format
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run validate
git diff --check
git status --short --branch
git diff --stat
git diff
```

Manual live verification must cover:

1. `NBA_DATA_PROVIDER=fixture` with no network requirement.
2. Invalid provider and timeout configuration failing before `listen`.
3. `NBA_DATA_PROVIDER=nba-stats` player search.
4. Active and inactive/free-agent profiles.
5. One normal season and one traded season.
6. Career trends.
7. Home and away game-log rows.
8. Two-player comparison.
9. Repeated requests proving cache hits and in-flight de-duplication.
10. Controlled mocked timeout, 403, 429, HTML, and schema-drift responses.

## Implementation Result (2026-06-22)

Implemented, independently reviewed against this specification, and merged into `main`. The
architecture, endpoint set, configuration, and risk posture match ADR-013.

Merge record:

- Planning-definition commit: `1a49c24` ("docs: define live NBA provider task")
- Final provider-plan commit: `4be8852` ("docs: finalize accepted-risk NBA.com provider plan")
- Implementation commit: `7f6a33d` ("feat: integrate live NBA data provider")
- Initial documentation pull request: #8 (merge commit `6b417eb`)
- Implementation pull request: #9 (merge commit `f8256d2`)
- Verified merged baseline: 139 frontend tests and 173 backend tests (312 total); production
  bundle 714.05 KB JavaScript (212.81 KB gzip) and 13.47 KB CSS (3.46 KB gzip); the existing
  Recharts/Vite "chunk larger than 500 KB" warning remains known and non-blocking.

The independent review corrected strict handling of explicitly empty configuration values,
enforced every committed endpoint column and required result set (including
`AvailableSeasons`), rejected duplicate or malformed unused result sets, used explicit
first-name/surname directory fields, normalized valid hybrid NBA positions into the existing
public contract, rejected malformed multi-team career data consistently, and ensured
domain-invalid career responses cannot be cached. Focused regression tests cover each repair.

### Files created

- `backend/src/config/player-provider-config.ts` (+ test) — `NBA_DATA_PROVIDER` /
  `NBA_STATS_TIMEOUT_MS` parsing with strict, fail-before-listen validation.
- `backend/src/features/players/provider-error.ts` — `PROVIDER_TIMEOUT` /
  `PROVIDER_UNAVAILABLE` / `PROVIDER_INVALID_RESPONSE` and their stable HTTP mapping.
- `backend/src/features/players/player-provider-factory.ts` (+ test) — the composition root that
  selects fixture or live provider.
- `backend/src/features/players/nba-stats/nba-stats-cache.ts` (+ test) — bounded (500-entry) LRU
  with TTL, in-flight de-duplication, errors never cached, injectable clock, per-test factory.
- `backend/src/features/players/nba-stats/nba-stats-http-client.ts` (+ test) — Node 22
  `fetch`/`URL`/`URLSearchParams`/`AbortController`, approved headers, 10s timeout, zero retries,
  status/content-type checks, no leakage.
- `backend/src/features/players/nba-stats/nba-stats-response.ts` (+ test) — `zod` envelope and
  result-set validation with typed cell accessors.
- `backend/src/features/players/nba-stats/nba-stats-search.ts` (+ test) — deterministic local
  ranking over the cached directory.
- `backend/src/features/players/nba-stats/nba-stats-mappers.ts` (+ test) — directory, profile,
  seasons/selected-season/career-trend (with `TOT` aggregate handling), and game-log mapping.
- `backend/src/features/players/nba-stats/nba-stats-player-provider.ts` (+ test) —
  `NbaStatsPlayerProvider` and the current-season helper.

### Files modified

- `backend/src/app.ts` — `createApp(playerProvider?)` injection.
- `backend/src/server.ts` — parse config, build the selected provider, fail before `listen`.
- `backend/src/middleware/errors.ts` — map `ProviderError` to 504/503/502 generically.
- `backend/package.json` + `package-lock.json` — added the direct `zod@^4.4.3` backend dependency
  (the contracts-compatible version). No other dependency changed.
- `backend/.env.example` — documented `NBA_DATA_PROVIDER` and `NBA_STATS_TIMEOUT_MS` (no secrets).
- `packages/contracts/src/player-search.ts`, `player-profile.ts`, `player-season.ts` — made
  `team` optional on `PlayerSummary`, `PlayerProfile`, `PlayerSeason`, `PlayerSeasonStats`
  (game-log `team`/`opponent` stay required).
- Frontend `No current team` (search, profile) and `Multiple teams` (season selector, season
  statistics, comparison table) fallbacks in `PlayerCombobox.tsx`, `PlayerProfilePage.tsx`,
  `PlayerSeasonStatistics.tsx`, `PlayerComparisonTable.tsx`, with regression tests in the four
  matching frontend test files.
- Backend `players-router.test.ts`, `season-router.test.ts`, `season-trends-router.test.ts` —
  optional-team contract assertions and provider-error HTTP mapping.

No files were deleted. The `PlayerProvider` interface is unchanged.

### Verification (all offline)

- Formatting, lint, strict type-check, and production build pass.
- Tests: **139 frontend** and **173 backend** — **312 total** — all passing. No automated test
  contacts NBA.com; the HTTP client tests mock `globalThis.fetch`, the provider tests inject a
  fake client, and fixture-backed route tests are unchanged.
- Production bundle: **714.05 KB** JavaScript (212.81 KB gzip) and **13.47 KB** CSS (3.46 KB
  gzip). The pre-existing Recharts/Vite "chunk larger than 500 KB" warning remains and is
  non-blocking.
- No live NBA.com request was made during implementation or testing. No real `.env`, API key,
  or raw upstream payload exists in the repository.

### Not done in this turn / limitations

- No live NBA.com requests and no deployment-connectivity gate were performed (out of scope for
  this turn; required before production `nba-stats` is enabled per ADR-013).
- The cache is process-local; restarts, cold starts, and multiple instances do not share it.
- Endpoint availability, schema stability, and cloud-host reachability for NBA.com are not
  guaranteed (accepted risk, ADR-013).
- Public deployment and the deployment-host NBA.com connectivity gate are not done; they are
  TASK-009.

## Suggested Commit Boundaries

The implementation was merged into `main` using coherent commit boundaries:

1. `docs: finalize accepted-risk NBA.com provider plan`
2. `feat: support players and seasons without a single team`
3. `feat: add direct NBA Stats player provider`
4. `test: cover NBA Stats failures caching and provider selection`
5. `docs: record TASK-008 implementation results`

These commits were merged into `main` through pull request #9 (`f8256d2`).

## Deployment-Connectivity Gate

Before setting `NBA_DATA_PROVIDER=nba-stats` in production:

1. Run one request from the intended deployment environment to each selected endpoint:
   `commonallplayers`, `commonplayerinfo`, `playercareerstats`, and `playergamelog`.
2. Use the production implementation's headers and 10-second timeout.
3. Use only known IDs such as Stephen Curry `201939` or LeBron James `2544`.
4. Verify HTTP 200, JSON content type, required result-set names, and acceptable latency.
5. Repeat only enough to establish consistency; do not load-test or intentionally trigger
   blocking.
6. Record the host, date, endpoint outcomes, and latency without storing raw payloads or cookies.
7. If requests time out, return 403/429, return HTML, or are unreliable, stop production
   enablement and document the failure.

No proxy, WAF bypass, rotating IP, residential IP, cookie harvesting, or other evasion is
permitted.

## Documentation And Attribution

README and any eventual deployed application must state prominently:

```text
This is an unofficial portfolio project and is not affiliated with, endorsed by, or sponsored
by the National Basketball Association. NBA statistics and data are sourced from NBA.com.
```

Documentation must also state that endpoint availability, schema stability, historical
correctness, and uptime are not guaranteed, and that fixture mode is available for offline
demonstrations.

## Acceptance Criteria

- [ ] `NbaStatsPlayerProvider` implements the unchanged `PlayerProvider` interface.
- [ ] Runtime selection uses `NBA_DATA_PROVIDER=fixture|nba-stats`.
- [ ] Invalid configuration fails before startup.
- [ ] NBA.com failures never silently return fixtures.
- [ ] Search is local over cached live `commonallplayers` data and preserves the two-character
      minimum.
- [ ] Existing NBA.com IDs and route URLs remain unchanged.
- [ ] Profiles represent missing teams honestly.
- [ ] Career statistics serve seasons, selected stats, trends, and comparison from one cached
      response per player.
- [ ] Traded-season aggregate rows never expose `TOT` as a real team.
- [ ] Game logs map every existing public field.
- [ ] Timeout, unavailable, and invalid-response errors map to stable public responses.
- [ ] Cache size, expiry, and in-flight behavior are bounded and tested.
- [ ] CI and all automated tests remain offline and deterministic.
- [ ] Attribution and unofficial-project disclaimers are present.
- [ ] The intended deployment environment passes the connectivity gate before live production
      mode is enabled.
- [ ] Formatting, lint, strict type checking, tests, production build, and full validation pass.
- [ ] The complete diff is reviewed.

## Explicit Exclusions

- Python or an `nba_api` sidecar.
- `LeagueDashPlayerStats` without a separately proven requirement.
- Proxies, WAF bypassing, IP rotation, or blocking evasion.
- Public deployment as part of TASK-008.
- Database or distributed cache.
- Play-by-play, live scores, shot charts, advanced metrics, rankings, predictions, authentication,
  accounts, favourites, or unrelated frontend redesign.
- Automated tests that call NBA.com.
- Silent fixture fallback in live mode.

## Definition Of Done

TASK-008 is done only when the accepted plan is implemented, the complete offline regression and
provider test suites pass, bounded local live verification succeeds, the production host passes
the connectivity gate before live enablement, documentation records verified outcomes and
limitations, the complete diff is reviewed, and no commit or push occurs without explicit
instruction.
