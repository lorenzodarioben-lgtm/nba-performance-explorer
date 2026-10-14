# Verification log

## Local research and static-team milestone

- Focused My NBA + affected insights/lab tests: 43 passed after rejecting dangerous
  JSON object keys found by the import test. Corrupt data is not overwritten on load.
- Team route tests: 8 passed. Team UI tests: 3 passed after correcting the encoded
  ID MSW handler and waiting for the loaded empty state rather than the loader.
- Full gate caught ESLint no-control-regex; equivalent character checks replaced
  that regex without weakening lint. `npm run validate` then passed:
  238 frontend + 291 backend = 529 tests, all builds, no lint warnings.
- `npx tsx backend/src/scripts/probe-season-totals.ts`: two existing career endpoint
  requests with PerMode=Totals passed. Curry 17 rows, Dončić 10, one 2023-24 row
  each; required numeric inputs validated, 466/327 ms. 2026-10-13T16:48:42Z,
  local engineering host, not Render. No browser/pixel comparison claimed yet.

## Implementation milestone — insights and comparison

- `npm run test --workspace backend -- src/features/research`: 37 passed.
- `npm run test --workspace frontend -- src/features/player-insights src/features/explorer`: 7 passed.
- `npm run typecheck`: passed after repairing query schema Zod pipe typing.
- `npm run validate` (insights spine): passed, 197 frontend + 283 backend = 480.
  New React fast-refresh export warning subsequently removed with direct scoped
  CSS imports. Existing Vite bundle warning remains.
- `npm run test --workspace frontend -- src/features/comparison-lab`: 17 passed.
- `npm run smoke:free-sources`: all 12 checks passed locally, no retries, 5-second
  timeout, 288–1,932 ms per check. Search 7; profiles 1 each; career season counts
  Curry 17, LeBron 23, Wembanyama 3, Jordan 15, Dončić 8; Curry 2023-24 games 74.
  Check timestamp `2026-10-13T16:24:14.079Z` (2026-10-14 Australia/Sydney).
  Existing four endpoints only. No new feed or Render source check.

## 2026-10-14 — Windows / PowerShell / Node v22.19.0 / npm 10.9.3

- Fully read the authoritative 1,107-line specification in bounded chunks.
- `git status --short --branch`: initial clean main, base cd557e4.
- Audited package scripts, CI, deployment, routes, provider/cache/errors, contracts,
  protected styles, legacy page tests and project/architecture/decision/state docs.
- No applicable AGENTS.md found in repository or inspected parents.
- `npm ci`: sandbox failure, `Exit handler never called!`; elevated retry pending.
- `git switch -c codex/nba-explorer-2-engine`: succeeded after required filesystem approval.
- Read current NBA/Disney terms and all candidate repository roots. No live
  endpoint was claimed validated by that research.
- UI skill accessibility search returned keyboard navigation and skip-link guidance.
- No browser journey or pixel comparison performed yet.
  `npm ci --no-audit --no-fund` passed (461 packages). Baseline `npm run validate` passed outside sandbox: 190 frontend + 244 backend = 434 tests, all gates and builds. Initial sandbox run failed before test collection due to EPERM temp-file rename. Baseline frontend JS 753.12 kB / 222.69 kB gzip; known chunk warning.

Combined insight/comparison milestone: npm run validate passed, 214 frontend + 283 backend = 497 tests. No lint warnings; known Vite chunk warning. git diff --check passed. No browser/pixel verification claimed yet.

## Genuine local engine acceptance and browser QA

`npm run smoke:engine` PASS at 2026-10-13T17:21:54.742Z (2026-10-14 Sydney).
Sixteen sequential public API/SPA checks: 74 observed Curry 2023-24 games,
latest sample 10, two BOS matches, raw TS/eFG exact-input reconciliation, three
available compare slots and three eligible raw TS/AST-TO slots, reversed weights
changed results, all 30 current identities, six direct SPA refresh routes.
Report: LIVE_ENGINE_ACCEPTANCE.json. No Render/deployment-host execution.
Subsequent small-sample/saved-season/identity hardening changed no metric inputs
or math and was covered with deterministic regression tests/typechecking.

Codex in-app browser, genuine local NBA mode, source and client reads same-origin:

- Explorer search Stephen Curry → real insights; selected 2023-24, window 10,
  opponent BOS. URL restored values, 2 matching of 74 observed, six tables, no alerts.
- Direct 3-player comparison Curry/LeBron/Wembanyama 2023-24 restored all picks;
  points metric changed table and share URL. Individual missingness also fixture-tested.
- Comparison → analytics; selected TS/AST-TO and negative X weight; actual 3 points
  and 3 table rows, 3 qualifying / 0 excluded, visible formula, no alerts.
- Save analysis → My NBA reload/export; added two real player favorites and a
  current team; reloaded, all 4 saved items persisted. Invalid version import
  rejected with all 4 preserved; valid export import merged without duplication.
  Team favorite linked to sourced identity and explicit absent season capabilities.
- Original home search → Curry original profile → season change; original compare
  direct URL and refresh retained players/year. Native home/compare screenshots.
- 664x704: new insights and old home/compare had no page-level overflow in DOM checks.
  390x844: analytics page no outer overflow; table region 335px client / 1245px
  scroll width; ArrowRight moved scrollLeft 39.5px. Three plotted/table rows.
  Viewport override reset. Screenshots emitted natively in chat, no image files saved.
- During a production rebuild with the browser open, old AnalyticsLabPage-Da4EycGU.js
  hash disappeared and the existing error boundary appeared. Console confirmed lazy
  import failure, not NBA data failure. Reload recovered all real data and controls.
  Record cache/asset rollover as a Shot 3 operational test, not a clean pixel baseline.
- Initial exact-label Season locator missed labels containing option text; semantic
  combobox locator successfully switched the same actual select. No UI code suppressed.

Journeys: 1 exercised legacy search/profile/season and compare URL refresh with
source diff/tests (no matched-fixture pixel test); 5 real three-player comparison;
6 real raw-metric custom cohort; 9 local favorites/reload/import/export completed.
Journeys 2/3/4/7/8 need absent game/roster/league/shot/history prerequisites;
10 source/timeout/403/invalid/missingness behavior tested deterministically.

Complete raw/analytics gate passed 246 frontend + 318 backend = 564. After filtered
window, saved resolved season and custom-window fixes: full gate 247 + 319 = 566.
Final identity guards: `npm run typecheck` and backend research-focused suite
66 passed. Final full source/docs gate follows; do not invent that result beforehand.
Original protected-file diff command returned no paths; git diff --check passed.
No new dependency or production configuration change. Four QA bookmarks exist
only at local browser origin localhost:3002; no server/cloud writes or telemetry.

## Final combined source and documentation gate

`npm run validate` PASS: 25 frontend files / 247 tests, 23 backend files / 320 tests,
567 total. Formatting, lint (no warnings), strict typechecks and all production
builds passed. Original 190+244 retained; 133 added tests. Source/doc changes
included final identity guards. Known Vite/Recharts chunk-size warning only.
Final JS entry 636.79kB / 187.65kB gzip plus shared contracts chunk 125.93kB /
38.22kB gzip; new route chunks 1.5–11.26kB. These are artifact sizes, not a measured
speed improvement over the baseline. No dependencies or lockfile change.

`git diff --check` PASS; protected frontend/backend player trees, styles/assets,
metadata, render.yaml and lockfile returned no paths in baseline diff. Feature
ledger actual grouped counts: verified 28, partial 7, data blocked 83, deferred 16
(134 total). Source implementation committed at a20fcf23ec81f59ef758ec91e131f99f07d71dc0;
final docs-only checkpoint follows. Not deployed, merged or pushed.

## Resumed execution — career checkpoint

Previous execution ended voluntarily after checkpoints. No recorded tool/context/execution limit or technical blocker forced that termination; independent scope remained. Continued immediately after user steering. Current full `npm run validate` passed: 251 frontend + 326 backend = 577 tests, format/lint/types/builds. New focused calculation/API tests cover raw weighted aggregation, null/zero denominators, ties, duplicate/identity rejection, min-GP boundaries, absent/error scopes, isolated transient comparison failures. UI tests cover direct URLs, save criteria, demand-loaded peak, slot preservation, and curve gaps.

Genuine local smoke PASS at 2026-10-13T19:44:31.083Z: six bounded API/SPA reads; Curry 17, LeBron 23, Jordan 15 reported seasons; exact raw sums and qualified peak calculation checked independently; two-player TS career comparison, two direct refreshes. Sanitized evidence: LIVE_CAREER_ACCEPTANCE.json. Production host not tested.

Two bounded existing-family postseason field probes passed at 19:40:57–58Z: Curry career SeasonTotalsPostSeason 10 rows, 2022-23 Playoffs PlayerGameLog 13 rows; numeric attempts/defensive fields validated. This is local field evidence, not yet acceptance of an implemented postseason feature. Initial new-slice checks caught a fetch-helper argument/parser error, a mistaken test expectation for the existing 503 unavailable status, and an incorrect combobox prop; all corrected before passing gate.

## Raw-game and postseason checkpoint (2026-10-14)

Full unchanged `npm run validate` PASS: 255 frontend + 336 backend = 591. Nine raw-game tests plus postseason totals test and four UI cases cover weighted attempts, null propagation, duplicates/date/identity/type guards, pre-window thresholds, cache TTL/dedup/no failure cache, unsupported fixtures, summary failure isolation and scope comparison. Genuine local acceptance PASS at 2026-10-13T19:59:14.333Z: six bounded reads; Curry 74 regular games, six >=40-point games, 13 2022-23 playoff games, 10 playoff career seasons; exact weighted formulas, filtered rolling and separate GP verified. LIVE_GAME_RESEARCH_ACCEPTANCE.json. Browser at 390×844: document width375, five tables contained in335px groups; raw ledger keyboard ArrowRight moved40px; no alerts. Viewport reset. Initial UI assertions correctly encountered duplicate high/low evidence and cached reset data; corrected to verify ties and rendered share state. Production host not tested.

## CC0 history and qualification checkpoint (2026-10-14)

Full `npm run validate` PASS:258 frontend+344 backend=602. History7 source/API tests and3 UI cases cover century rollover, Summer League exclusion, missing/multiple winners, source IDs/duplicates, fixed query/cache,429 cooldown, payload cap, invalid JSON, timeout, filters/navigation and local save. Added minimum-sample qualifier calculation test. Genuine local history smoke PASS at2026-10-13T20:11:23.451Z: five reads,78 entities,84 raw rows,6 exclusions,6 missing winners, safe entity filter and two SPA refreshes. LIVE_HISTORY_ACCEPTANCE.json. Initial gate caught unsupported Testing Library role-option syntax; corrected before final pass. No production host verification.

## Usage-limit resume verification (2026-10-14)

The interrupted full gate62160 completedPASS:264 frontend+350 backend=614, with formatting/lint/strict types/builds. Earlier unconstrained jsdom runs produced2 then25 asynchronous failures across existing/new suites; all259 then-existing frontend tests passed unchanged with one worker. Capped jsdom workers at2; all264 tests passed in43.39s. Assertions/timeouts unchanged. Genuine age/team-stint smoke passed3 local reads at2026-10-13T21:01:35.690Z; source birth date/age boundary and Luka2024-25 DAL/LAL split GP checked. Human confirmed account usage interruption; exact pending state preserved on resume.

## Licensed historical archive verified checkpoint

Full `npm run validate` PASS:271 frontend tests/30files +357 backend tests/28files =628; format,lint,types and all builds pass. Fixed real Express handler arity and source signed-plus-minus parsing; strict identity/period-sum reconciliation added. Initial new synthetic UI responses had invalid abbreviation/origin expectations, corrected without loosening production schemas. Existing assertions/timeouts preserved; maxWorkers2 remains stable. Unnecessary regex escapes and formatting repaired. Nonblocking pre-existing Vite chunk warning persists.

LIVE_WIKI_ARCHIVE_ACCEPTANCE.json PASS at2026-10-13T21:34:23.264Z:10 bounded local reads,30 standings,27 leader entries,82 playoff games,3 overtime, exact source IDs, all quarter sums, date/team filters and4 SPA direct refreshes. Genuine Wikipedia source/revisions verified; production host NOT_TESTED. No fixture fallback. One synthetic HTML parser media-test false positive narrowly suppressed in tracked detector config; no production image issue.

Team-source investigation: one normal public API read of2023–24 Los Angeles Lakers season (revision1358934092,287k response) exposes18 historical roster rows, regular schedule and scoped summary tables. One exact-article CC0 P3647 query mapped17/18 player identities; missing mapping must remain unavailable. Candidate not yet integrated at this checkpoint. No inferred medical injury, raw totals or current roster.

Browser QA: genuine scoreboard date2024-04-21 showed4 finals and actual game-ID navigation; game detail displayed venue/timezone warning,4 reconciled quarters and published tied leaders. Phone390x844 standings table stayed within335px container (600px content), keyboard ArrowRight scrolled it; no page overflow. Screenshot emitted in chat; viewport reset. No saved pixel-comparison claim.

## Selected-season discovery checkpoint

Full634 gate PASS:277 frontend/32files +357 backend/28files; format/lint/types/build pass. Six new tests cover distance decomposition, ties, constant metrics, missing/excluded targets, unsafe/duplicate state, source failures, shared filters and random known targets. LIVE_DISCOVERY_ACCEPTANCE.json PASS:2 local genuine API/SPA reads,3 qualifying2023-24 seasons, finite peer distances and direct route refresh. No league-wide similarity/era claim. Source/provider/frozen visual paths unchanged.

Browser genuine discovery confirmed3 qualifying seasons, source/evidence links, explicit selected-pool limits, target state and two finite candidate distances matching smoke output.

## Active historical team validation

Focused source/parser/API tests PASS13; focused team/archive UI tests PASS13; types PASS before final layout additions (rerunning full gate). Normal genuine Lakers/Celtics provider checks passed82 regular games plus separate summaries,18/18 and17/17 roster NBA ID mappings. Warriors had two unlinked opponent labels, resolved only through identical same-page explicitly linked aliases; all82 finals then reconciled. Opt-in serial30-page audit found OKC preseason/percent notation difference, fixed by excluding explicit preseason and converting explicit% units; all30 cached real responses now pass without more requests. Alternate participant tables added raw totals; all30 pass,29 regular tables639 rows and Chicago18 unspecified rows. LIVE_TEAM_COMPATIBILITY.json records source revisions and scopes; not production-host acceptance or full identity enrichment.

Full historical team gate PASS:280 frontend/33files +363 backend/29files =643; format/lint/types/build PASS. LIVE_TEAM_ARCHIVE_ACCEPTANCE.json PASS4 genuine local reads at2026-10-13T22:11:18.254Z: LAL18/18,BOS17/17,CHI18/18 roster ID mappings;82 regular finals each, Chicago scope/raw basis preserved, direct SPA refresh. Browser genuine LAL roster links and source notices verified; playoff GP5 filter showed8 qualifying rows and tied27.8PTS leaders, away regular filter returned19–21 over40 recorded finals. Source/cached corpus remains separate from synthetic unit fixtures. No production-host deployment or pixel comparison.

Shooting checkpoint full gate PASS648 tests (285frontend/35files+363backend/29files); all format/lint/types/build pass. Five focused tests verify subtraction, score reconciliation, missing/zero/low attempts, free-throw rates above1, unsupported state/scope and saved URLs. LIVE_SHOOTING_ACCEPTANCE.json PASS3 genuine local reads: Curry2022-23 regular56GP/playoffs13GP, every type count/made-shot point sum reconciled; SPA refresh. Source families/legacy visual files unchanged.

## Recorded archive verified checkpoint

Full658 gate PASS:289frontend/36files +369backend/30files; format/lint/types/build pass. Six new backend and four frontend tests cover actual dataset coverage, GP-before-ranking, fixed search population, raw trade aggregation, missing metrics, ties/midrank percentiles, conflict quarantine, strict URLs, editable invalid input, source-disabled states, bounded formula-safe CSV and save routes. Corrected exact optional query typing and asynchronous scope test readiness; floating percentile tests use appropriate precision. Genuine JSON packaging confirmed by successful server startup. LIVE_RECORDED_ARCHIVE_ACCEPTANCE.json PASS six local API/SPA reads, zero runtime source calls;639 source rows,363 qualifying GP20 players,17 missing-ID rows,59 unsupported metrics,18 unknown-scope rows;1219 agreed games/9 conflicts/2 unpaired. Browser Curry search/GP60 then70 preserved original ranking populations and exact source values/evidence.

Native CSV export succeeded to Downloads; inspected headers preserve CC BY-SA4.0, source date range, cohort coverage, exact revision and one Curry row for selected page. The browser download call returned after27859.8434seconds despite timeoutMs10000; current clock06:40:55UTC confirms elapsed tool delay. No reason for that tool delay is established. Avoid this blocking download-wait path; continue independent API/CLI checks. No files were discarded or source data changed during that wait.

Recorded labs full gate PASS665:292frontend/37files+373backend/31files, format/lint/types/build PASS. Four backend and three frontend tests verify unique directory/cardinality, incomplete selections, exact supported scope, independent raw-count missingness, no joint performance, reconciled pair samples and saved URLs. LIVE_RECORDED_LABS_ACCEPTANCE.json PASS5 local reads with no runtime source requests;564 known identities/30 teams;5 independent LAL summaries/no raw point inference;2 source-agreed LAL/BOS meetings,11 globally quarantined IDs; LAL82GP47–35, BOS81GP63–18 observed after quarantine. Browser actual five-member table confirmed sourced values and unavailable individual raw points/joint performance.

## Recorded analytics verification

Full672 gate PASS295frontend/38files+377backend/32files; format/lint/types/build pass, existing Vite chunk warning. Seven new focused cases cover population SD, linear quantiles, histogram boundary conservation, signed weights/ties, common-cohort identity support, excluded target, constant/small-sample Pearson missingness, URL/API validation and chart/table parity. LIVE_RECORDED_ANALYTICS_ACCEPTANCE.json PASS4 genuine local reads with zero source requests:363 GP20 pairs,639 source rows, Curry26.4PTS, excluded999 withheld, changed signed ranking, r0.6034018697 and SPA refresh. Source updater --help checked without network/write. A local server initially loaded the previous build; restarted identified local process before successful acceptance. No production-host or complete population claim.

## Authentic shot validation

Initial full683 gate PASS300frontend/39files+383backend/33files,format/lint/types/builds. Eleven new cases cover genuine CSV/hash/counts, all-row radial/side reconciliation, source/game/event integrity, duplicate/conflict rejection, quoted CSV/missing geometry, all-filter versus page denominator, ratio qualification/weighted scoring, strict/APIdisabled failure, plot/table parity, density/filter/recovery/comparison/save, safe bounded CSV/SVG metadata. UI tests initially assumed region while existing ResearchTable uses group; corrected test role without production schema/assertion/time changes. Source CSV copied correctly by build. LIVE_SHOT_ARCHIVE_ACCEPTANCE.json PASS6 genuine local reads:13,470/6,143 attempts/makes;80games/203players/16teams; Curry261attempts122makes; group/zone/density conservation, exactFinals game2 ID0041700402 andSPArefresh. Browser100dots/100rows andactualCurry ratios verified. Mobile found native-select/hash overflow; scoped labelmaxwidth/wrapping repaired, final gate/QA rerun required before checkpoint.

Final shot gate683 PASS again after scoped mobile fix; all tests/types/build/source-copy pass. At390px browser actual document width375 (scrollbar), all controls fit, exact table remains335px scroll container;100actual event marks/100rows. Density/second-player controls work. No browser download wait used. Original protected-path diff empty against cd557e4; source CSV hashes identical before/after build/Git byte policy.
