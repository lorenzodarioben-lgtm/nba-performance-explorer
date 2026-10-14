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

## Resumed career slice (2026-10-14)

GET `/api/players/:id/career?metric=pointsPerGame&minGames=20` returns reported raw season rows, nullable count aggregates, weighted efficiency, milestone thresholds and all qualified peak ties. Metrics: pointsPerGame, reboundsPerGame, assistsPerGame, trueShooting, effectiveFieldGoal, pointsPer36; minimum games 1–82. Regular season only at this checkpoint. Strict IDs/query keys; 400 invalid, 404 absent player, 405 unsupported method; upstream 502/503/504 remain sanitized. Unsupported raw provider returns explicit unsupported, never fixture fallback. GET `/api/analytics/careers?players=id,id&metric=...&minGames=...` accepts 2–4 unique IDs, preserves absent/transient slots, rejects corrupt records. Shared source budget and raw cache apply.

New SPA routes `/players/:id/career` and `/lab/careers`; comparison peak picker loads on demand. Career axis is calendar year or reported season number, explicitly not verified experience.

## Raw-game and postseason checkpoint (2026-10-14)

GET `/api/players/:id/game-research` requires season and supports scope (regular-season/playoffs), window 1–20, date/opponent/location/result filters, minPoints 0–200, minRebounds/minAssists 0–100, minMinutes 0–100, raw sort and page bounds. Response includes raw attempts and STL/BLK/TOV, weighted cohorts/rolling, extrema with date/opponent/ID evidence, observed/summary GP and explicit missingness. GET `/api/players/:id/season-scopes?season=...` returns separately labelled raw regular/playoff rows. Career and career-comparison APIs now accept scope, default regular-season. New SPA `/players/:id/games`; old APIs remain regular-only and unchanged.

## CC0 history and qualification checkpoint (2026-10-14)

GET `/api/history/seasons` and `/api/history/seasons/:season` support optional integer from/to season start years (1946–2100) and champion=`wd:Q...`; strict identities/keys and bounded100 output. Record-backed previous/next navigation, per-source coverage/cap metadata, missing winners and safe Wikidata entity links. Provider disabled returns unsupported; absent detail404; source502/503/504 sanitized. Query fixed, no user SPARQL. Raw game query additionally supports minSample1–150 (default1); small cohorts retain raw data but derived values null.

## Age, team stints and opt-in history checkpoint (2026-10-14)

Career responses add nullable sourced birthDate/retrievedAt, age reference October1 of season start year, per-season completed age and raw team stint IDs/abbreviations/GP. Transient bio failure preserves raw career with null age; invalid bio identity/calendar data rejected. No legacy profile contract changed. Optional recent history uses separate version1 local storage, no API mutations.

## Licensed historical league/game archive (2026-10-14)

GET `/api/standings` and `/api/leaders` return the same bounded2023-24 regular-season snapshot with30 standings, published category winners, revision/contributor/licence attribution and nonlive provenance. Optional season must be2023-24; unknown/duplicate query values400. GET `/api/games?season=2023-24&date=YYYY-MM-DD&team=nba:...` filters recorded2024 playoff finals; metadata counts/date coverage refer to the full source. GET `/api/games/nba:00423xxxxx` resolves only a recorded source ID,404 if absent. Period sums/identities validated; tipoffUtc null, source time unconverted. Disabled503; malformed source502, timeout504, rate-limit/unavailable503;405 unsupported methods. No source details leaked or fixtures substituted.

SPA `/games`, `/games/:gameId`, `/standings`, `/leaders` and opt-in `/teams/:teamId?archive=2023-24&side=home|away`. URL filters/search/sort, saved state, exact game links and explicit source coverage; attribution shown on every adapted data view.

## Selected-season discovery

SPA `/discover` reuses `/api/analytics/cohort` for2–4 selected regular-season player-seasons. players/seasons/x/y/minGames shareable, optional target must belong to pool. Target is stripped before API request; unsupported weight controls and duplicate/identical metric state rejected. Saved URLs freeze resolved target. Formula/contributions, source-season links and exact analytics evidence shown.

## Historical team details

GET `/api/teams/:teamId/archive?season=2023-24` returns source-listed historical roster, nullable exact Wiki/Wikidata NBA-ID mappings,82 source regular finals, and participant arrays in regular-season/playoffs/source-unspecified scopes. DOB ages use October1,2023; missing IDs retain only external source links. Explicit raw total columns are optional, never reconstructed from rounded averages. Wrong ID/query400, unknown team404, disabled/unavailable503, corrupt source502, timeout504, unsupported method405. Shared source-work budget applies. Temporary mapping outage preserves historical data with null NBA IDs; corrupt mappings reject.

Team page `details=2023-24` loads this source on demand; participants/minGames/metric/search/side filters stay in URL and use cached validated rows. Existing optional standings/playoff panel remains separate.

SPA `/players/:id/shooting` reuses scoped career raw totals. season/scope/minAttempts shareable, strict duplicate-safe state; latest reported source season selected when omitted and frozen in saved URL. Unknown season stays unavailable. Two-point/three-point/free-throw counts and contributions are distinct from shot-event maps. No new NBA family or runtime data fallback.

## Recorded historical cohort/records

GET `/api/recorded/leaders`: fixed2023-24 season, regular-season/playoffs scope, supported numeric metric, minGames1–150/default20, optional team/search, page1–99/pageSize1–50. Qualify identified source rows first; traded metrics combine only explicit raw counts, otherwise excluded. Search/team/page retain qualifying rank/percentile population. Missing-ID, low-GP, metric and unknown-scope exclusions reported. GET `/api/recorded/records` supports team and teamPoints/finalMargin/combinedPoints; only paired-source-agreed regular finals enter extrema, all ties retained, conflict/unpaired IDs disclosed. Strict malformed queries400, unknown team404, disabled503, methods405. No runtime upstream calls or fixture fallback. SPA `/leaders/recorded` and `/history/records`, safe saved/shareable filters, bounded licensed CSV on current ranking page.

Recorded labs: GET `/api/recorded/directory` supplies30 source teams/564 mapped NBA identities with full source credits. GET `/api/recorded/hypothetical?players=id,id,id,id,id&scope=regular-season|playoffs` requires5 distinct positive IDs; kind hypothetical, observedLineup false, jointPerformance null. Independent member stats missing/source-incomplete values null; sums only explicit raw individual counts. GET `/api/recorded/team-comparison?teams=nba:id,nba:id` requires2 distinct known teams and fixed2023-24 regular scope; source-agreed samples, scoring averages and exact matching head-to-head IDs. Unknown team404, malformed/duplicate400, disabled503, other methods405. New SPA `/lab/groups`, `/lab/teams`, safe saved query paths.

Recorded analytics GET `/api/recorded/analytics`: fixed2023-24 scope, different x/y supported ranking metrics, minGames1-150, optional target NBA ID, weights -5..5 with at most2 decimal places. Intersects both qualified metric populations; shared histogram/scatter/ranking/percentile denominator. Empty/missing target is unavailable, Pearson null for fewer than3 or constant pairs. Strict400/disabled503/method405. SPA `/lab/recorded` has exact equivalent table, target marker and safe saved URL.
