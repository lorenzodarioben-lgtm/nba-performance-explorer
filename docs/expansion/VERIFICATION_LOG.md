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
