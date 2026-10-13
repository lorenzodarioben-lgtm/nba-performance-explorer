# Expansion API catalog

All browser calls use same-origin `/api`. New schemas are exported from
`packages/contracts/src/`; upstream envelopes remain backend-private. Original
player routes and response contracts are unchanged.

| GET route                         | Query / identity                                                                                                                                                                                                                                                                                     | Response / scope                                                                                                                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/data-sources/status`        | None                                                                                                                                                                                                                                                                                                 | CapabilityResponse: configured source and available/conditional/blocked capabilities. checkedAt is configuration report time; hostVerified is false, not a health/freshness claim.                    |
| `/api/players/:playerId/insights` | NBA decimal ID max 12; season optional (newest observed default); window 1–20 default 5; inclusive real from/to dates; opponent uppercase three-letter abbreviation; location home/away; result W/L; sort date/points/rebounds/assists/minutes; order asc/desc; page 1–100; pageSize 1–50 default 20 | PlayerInsightsResponse: player, seasons, nullable season summary, paginated games, full-filtered cohort/recent averages, splits, rolling series and tied extrema. Observed regular-season scope only. |
| `/api/players/:playerId/totals`   | Same NBA ID; required valid season                                                                                                                                                                                                                                                                   | SeasonTotalsResponse: available/season-unavailable/unsupported, nullable raw totals/derived metrics, actual response retrieval timestamp when enabled. Fixture runtime has no invented raw totals.    |
| `/api/analytics/compare`          | players: 2–4 distinct comma-separated NBA IDs; aligned comma-separated seasons                                                                                                                                                                                                                       | ComparisonResponse: one row per selected player-season, nullable values and available/player-not-found/season-unavailable/source-unavailable statuses. Equal sourced units; no era adjustment.        |
| `/api/analytics/cohort`           | Same players/seasons; x/y supported metric enums; weightX/weightY -5..5 (up to 2 decimals), default 1; minGames 0..82 default 10 (zero played games always excluded)                                                                                                                                 | CohortResponse: selected rows, eligible exact x/y values, population z-scores, custom scores/ranks, exclusion reasons and nullable descriptive correlation. Max four, never a league population.      |
| `/api/teams`                      | optional search max 80 characters                                                                                                                                                                                                                                                                    | TeamDirectoryResponse: alphabetic search results, max 30 static sourced identities.                                                                                                                   |
| `/api/teams/:teamId`              | `nba:` namespaced numeric identity                                                                                                                                                                                                                                                                   | TeamDetailResponse: sourced identity and explicit false roster/schedule/statistics availability, not empty mock season tables.                                                                        |

Errors: 400 invalid/unknown/repeated query or namespace; 404 missing player/current
team; 405 unsupported methods; 502 invalid/mismatched upstream; 503 unavailable or
RESEARCH_BUSY; 504 upstream timeout. Missing selected seasons return explicit
nullable research states. Comparison/cohort outages are per-player missing rows.
No raw URLs, cookies, headers, provider bodies or private messages reach React.

Three shared simultaneous research source jobs maximum; no queue or automatic
retry. Each comparison/cohort has 2–4 sequential slots. Source work remains bounded
until settlement even if the browser disconnects. Original provider/cache untouched:
500-entry LRU with in-flight dedup; current logs 5 minutes, historic 7 days, empty
1 minute. Separate 100-entry raw career cache: 6 hours, empty 1 minute, exact Totals
mode and unique traded aggregate. Providers issue no retries.

New browser queries have 1-minute staleTime (raw totals 5 minutes, static directory
24 hours), no retries/focus refetch, and fetch cancellation on navigation. Legacy
profile/seasons hooks retain their existing settings. Legacy retrieval/as-of times
are unknown/null; servedAt is response time. Raw provider retrieval time is actual
fetch time, asOf remains unknown, isLive always false.

My NBA has no backend writes or telemetry. Storage key `nba-explorer.research.v1`;
version 1, max 100 bookmarks AND 100,000 serialized JSON characters, label max 100,
path max 1500. Only implemented internal routes, no fragments/backslashes/control
characters/protocol-relative/external URLs. Invalid/prototype-related JSON keys
rejected, import merges preserving existing entries, blocked/quota storage retains
session data. Export is selectable preference JSON to copy to a file; NBA bulk
statistics/PNG export is not enabled without redistribution rights review.

Opt-in source checks (not CI): `npm run smoke:free-sources`,
`npx tsx backend/src/scripts/probe-season-totals.ts`, `npm run smoke:engine`.
The last requires a genuine locally running server at 127.0.0.1:3002 (optional
NBA_ENGINE_SMOKE_ORIGIN is restricted to a local HTTP origin). Fixed 16 public API
and SPA checks, sequential and timeout-bounded; no raw response dump.
