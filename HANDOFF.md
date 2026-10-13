# NBA Performance Explorer 2.0 — Engineering Handoff

## Snapshot timestamp / branch / HEAD / base commit

2026-10-14 Australia/Sydney. Branch `codex/nba-explorer-2-engine`.
Implementation HEAD at snapshot: `a20fcf23ec81f59ef758ec91e131f99f07d71dc0`.
Base: `cd557e4d3cf75e44f930ba75de4ea149a80ccdda`.
Resumed after documentation checkpoint `9746df3` on 2026-10-14. Read
`git rev-parse HEAD` and `git status --short --branch` on resume.
NOT DEPLOYED / NOT MERGED / NOT PUSHED.

## Working tree and pending changes

ACTIVE IMPLEMENTATION. Previous execution stopped voluntarily after checkpoints;
there was no recorded execution limit or technical blocker requiring that stop.
Career raw totals, qualified peak selection, milestone tracker, season timeline,
and multi-player career curves are being implemented from the verified checkpoint.
Career checkpoint passed full 577-test validation and six genuine local API/SPA
reads (LIVE_CAREER_ACCEPTANCE.json). Pending checkpoint files include career
implementation, deterministic tests, two opt-in smoke/probe scripts and docs.
After this slice, continue raw game shooting, postseason modes, discovery and
opt-in local recent history. Checkpoints are not stopping conditions.

## Goal and non-negotiable constraints

Execute the fully read 1,107-line Shot 1 brief as engineering, not redesign.
Preserve original visuals/provider/history/credentials; zero mandatory costs;
real provenance or honest missing states; never merge main or deploy unapproved.
No applicable AGENTS.md found, including a final hidden-file search.
Overall WORKING_BUT_INCOMPLETE. Full platform design readiness NO; supported
insights/comparison/analytics/preferences are reviewable for a targeted design pass.

## Verified baseline and last validation results

Node v22.19.0 / npm 10.9.3. Initial clean main, baseline full 434 tests passed.
Sandbox `npm ci` failed (`Exit handler never called!`); authorized retry passed
461 packages. Sandbox Vitest failed before collection on temporary-file EPERM;
identical validation outside sandbox passed. Use permitted elevated execution
when that Windows sandbox limitation recurs; never weaken tests/config.

Latest complete source gate before final ID/scope guards: 247 frontend + 319
backend = 566 passing, format/lint/strict types/builds pass. Final guards then
passed typecheck and 66 research-focused backend tests. Final combined gate passed
247 frontend + 320 backend = 567, recorded below and in VERIFICATION_LOG.md.
Known existing Vite/Recharts chunk warning remains non-blocking.

## Completed commits and shipped-on-branch vertical slices

- `5886ea0`: audited baseline, source rights and initial execution records.
- `361299a`: source-aware explorer/insights/2–4 player comparison; full 497 tests.
- `81a815c`: My NBA and MIT sourced 30-team identity directory; full 529 tests.
- `a20fcf2`: separate raw shooting/efficiency provider, selected-cohort analytics,
  source budget, safe export size and identity/filter/URL hardening; genuine local
  source/API/browser evidence, full 566 before final guard/focused validation.

New routes: `/explore`, `/teams`, `/teams/:teamId`, `/players/:playerId/insights`,
`/lab/compare`, `/lab/analytics`, `/my-nba`. Seven new GET patterns documented
in docs/expansion/API_CATALOG.md. All non-sensitive local/provider inputs bounded.

## Current milestone and exact in-progress task

Stable supported engine slices implemented and source-verified locally. Final
source/docs full gate PASS (567); closing documentation checkpoint and handoff.
No claim that fan games, roster/schedule, standings, league populations, full
history, shots, lineup or discovery modules meet minimums. Conditional source
gates do not count as delivered features.

## Feature ledger summary (counts by status)

134 desired feature IDs: DONE_VERIFIED 28, PARTIAL 7, DATA_BLOCKED 83,
DEFERRED_BY_PRIORITY 16. Other categories 0. Partial/blocked total 90.
Definitions and feature-scoped limitations in FEATURE_LEDGER.md.
B/F/L supported minimums pass; H calculation/scatter/table/ranking/URL minimum
passes ONLY for explicit selected 2–4 player-seasons, not league analysis.
A/C/D/E/I/J/K minimums absent; G honest gated coverage. B01/B04/B08/B10 are
partial rather than pretending all raw/defensive/weighted/career fields shipped.

## Data sources (verified, conditional, blocked, rejected)

Existing FOUR named NBA endpoints passed 12 bounded local checks, 288–1,932ms:
Curry search 7/profile 1/career 17, 2023-24 games 74; LeBron career 23 (previously
empty, now nonempty); Wembanyama 3, Jordan 15, Doncic 8; profiles 1 each.
Totals parameter mode passed two probes (Curry 17 raw rows, Doncic 10 with traded
splits), 466/327ms. Actual raw adapter/TS/eFG input and GP/identity reconciliation
then passed live engine acceptance for three player-seasons. No new endpoint
family or raw traffic archive. Use remains conditional under accepted ADR-013.

MIT nba_api directory contains 30 static identity facts with license notice, not
NBA statistics, rosters, imagery or historical aliases. ESPN extraction rejected
by published terms; broader NBA/CDN/league/archive rights not cleared, connectivity
NOT_TESTED for those candidates. Render expansion host access NOT_TESTED.
No pricing/billing/API key requirement, proxies, cookie harvesting or evasion.

## Architecture and important decisions (with file pointers)

Original PlayerProvider/visual trees/public contracts untouched. New separate
SeasonTotalsProvider, TeamDirectoryProvider, strict research/raw/cohort/preference
contracts and pure backend math. Same-origin browser API. Three shared concurrent
source jobs, sequential capped 2–4 selections, no queue/retries or fixture fallback.
Legacy 500-entry process LRU; raw 100-entry cache (6h nonempty, 1m empty), unique
traded aggregate. Raw input nulls/zero denominators preserved. Legacy retrieval
unknown, raw retrieval actual, published asOf unknown, isLive false.

My NBA: local-only version 1 JSON, max 100 bookmarks AND 100k serialized characters,
safe implemented URLs, rejects unsafe/prototype keys, merge imports, explicit clear,
session fallback/corruption recovery. No accounts, server writes or telemetry.
New UI lazy, plain and scoped. No statistical bulk export. ADR-024 records scope.

## Files changed in current work session

Contracts and index exports; new backend research/math/source-budget/teams/scripts;
new frontend explorer/player-insights/comparison-lab/analytics-lab/my-nba/teams/
research and tests; additive App.tsx routes; app/server composition; package scripts;
README and factual engineering docs. No dependency additions or lockfile changes.
Use `git diff cd557e4 --name-only` for the full exact list.

## Tests and exact commands/results

- `npm ci --no-audit --no-fund`: passed (461 packages, outside sandbox).
- `npm run validate`: baseline 434; insights 480; comparison 497; My NBA/teams 529;
  raw/cohort 564; URL/sample hardening 566. All executed and passed.
- `npm run typecheck`: final identity guards passed.
- `npm run test --workspace backend -- src/features/research`: final focused 66 pass.
- Focused raw/analytics UI suite 12 pass; My NBA 22 pass; team route 8/UI 3 pass.
- `npm run smoke:free-sources`: 12 existing-source checks pass, no retries.
- `npx tsx backend/src/scripts/probe-season-totals.ts`: 2 numeric-field probes pass.
- `npm run smoke:engine`: 16 genuine local API/SPA checks PASS; report JSON recorded.
- `git diff --check`: passing at checkpoints; protected path diff empty.
- Final all-work gate: `npm run validate` PASS, 247 frontend + 320 backend = 567; format/lint/strict typechecks/all production builds passed. No lint warnings; known Vite/Recharts warning remains.

## Known bugs, security concerns and reliability limitations

No confirmed critical current-bundle defect. Upstream can return empty/blocked/
timed-out or revised data. Earlier missing LeBron career was nonempty this session,
not proof that the condition is fixed permanently. Broader source rights and Render
access unresolved. Weighted game shooting splits, complete careers/peak/trends,
playoffs/birthdates remain follow-ups; league-only/possession metrics unsupported.

Static rebuild while a browser tab held old lazy hashes caused a missing-chunk
error; existing boundary Reload recovered. This local rebuild/cache rollover is a
Shot 3 operational test, not a passing pixel regression. Refresh after builds.
Original header home anchors/static footer branding are frozen; local new-page
navigation and prominent real/fixture source labels supply current context.
QA created four bookmarks only at local origin localhost:3002; no cloud changes.
Temporary QA server stopped after verification; no listener remains on port 3002.

## Protected original UI baseline and visual check status

Base cd557e4. No diff to AppHeader/AppFooter/AppRoot/styles.css, legacy feature trees,
metadata, images/fonts, player-image map, docs/assets, render.yaml or lockfile.
App.tsx only adds lazy route elements/imports. Original 190/244 tests retained/pass.
Browser legacy home/search/profile/season and compare refresh inspected at 664x704;
new insights same viewport, analytics 390x844 no outer overflow, named table
keyboard-scrolled 39.5px with three exact rows matching plotted points.
Native screenshots in chat only; no new files or matched-fixture before/after
pixel diffs. ORIGINAL_VISUAL_DESIGN=unchanged_diff_only.

## Next task queue (ordered)

1. Reported-career summary/explicit min-games peak selection from existing validated
   raw-record cache, with missing-coverage labels; B09/F07, no rounded extrapolation.
2. Multiple career trend lines/tables using existing career data; no league fiction.
3. Probe/validate extended game-attempt fields within existing endpoint and add
   weighted home-away/W-L shooting splits without changing legacy contracts.
4. Obtain suitable free usage-rights-cleared game/roster/league sources and separately
   validate the actual intended host before building A/C/D/E fan/league foundations.
5. Conditional historical/shot/lineup/discovery and optional preferences, then
   supervised Shot 2 visuals and Shot 3 hardening. No automatic merge/deploy.

## Single NEXT ACTION (one exact command or file/task to open)

Continue separate postseason raw totals and extended individual game analysis
from the verified 10-row/13-game local probes. Preserve regular-only legacy
contracts. Add weighted shooting splits/rolling/thresholds with missingness tests.

## Continuation prompt for a new Codex session

CONTINUE FROM HERE: Read HANDOFF, ledger, source audit, calculations, API catalog
and latest verification; inspect Git and confirm the actual branch/HEAD/tree.
Resume NEXT ACTION, continue complete verified slices, preserve the original site,
never fabricate or extrapolate unavailable NBA facts, incur mandatory costs,
assume broader permissions, silently enable fixtures, merge main or deploy.

## Resumed verified checkpoint (supersedes earlier snapshot)

577-test full gate passed; six local genuine career reads PASS for Curry, LeBron,
Jordan, career comparison and SPA refreshes. Career source is existing Totals
mode only; scope remains reported regular seasons, never verified complete career.
Checkpoint commit follows this document. Continue postseason/game/discovery/local
history implementation; do not stop after this checkpoint.

## Latest verified checkpoint — raw games and postseason

Full591 tests pass; genuine six-read local acceptance and mobile keyboard QA pass.
Source/game/career scopes explicitly separate; protected original files unchanged.
See LIVE_GAME_RESEARCH_ACCEPTANCE.json and verification log. Checkpoint commit
follows. Continue immediately: CC0 Wikidata historical season navigator, then
selected-cohort similarity/discovery, opt-in recent history and hypothetical groups.
A free Wikidata candidate passed two bounded probes (84 rows, six summer labels
excluded, modern franchise labels and six missing champions require warnings).
Temporary genuine server session74364 is running at localhost3002; QA tab2 exists
in the in-app browser. Restart/reload after builds. Do not push/merge/deploy.

## Latest checkpoint — CC0 history (supersedes earlier queue)

Full602 tests pass; genuine5-read local history acceptance PASS (78 season
entities,6 missing winners). History/champion source is CC0 Wikidata, not official
NBA archive; label/coverage/cap/rate-limit safeguards are implemented. Raw-game
minSample qualification implemented and verified. Local server session32247 is
running on3002; in-app QA tab2 remains. Do not merge/push/deploy.
NEXT ACTION: implement DOB-based age-at-October1 curves and reported team stints
using existing profile/career families (two DOB probes passed20:10:42–43Z), then
selected-pool discovery, opt-in local recent history and hypothetical five-man
identity groups. Continue beyond checkpoints. Broad game/league feeds remain
rights-gated; CC0 alternative now unlocks narrow history without mandatory cost.

History inventory precision: I01 navigator is delivered; I05 year/decade filters, I08 championship facts and I11 fact-coverage views are partial. I02 statistical leaders, I03 statistical record book, I09 record progression and I10 era normalization are not delivered by the champion source. Those gates remain unavailable.

## Exact resumed state (supersedes older NEXT ACTION entries)

HEAD4135c4a verified age/stints/local consent. Full gate614 tests passed (264+350),
all other gates/builds passed. Live age/stints3-read acceptance PASS. Human
confirmed account usage limit, now restored; no pending source was discarded.
Current work: licensed Wikimedia season/playoff snapshot source. Two official
API probes passed for2023-24 season (revision1347383197,609k HTML) and2024
playoffs (revision1376206465,753k HTML). MIT parse5@8 runtime dependency added;
package/lockfile changes pending. Licensing requires source/contributor links,
CC BY-SA4.0 adaptation notice and no media reuse. Original NBA provider unchanged.
NEXT ACTION: implement bounded Wikimedia client + standings/category leaders
then recorded-playoff scoreboard/detail/team schedule. Do not stop at checkpoints.
Temporary local server session52234 on3002; restart after builds.

## Active checkpoint: licensed historical league/game archive

HEAD4135c4a; unfinished source work preserved. Historical source/parser/API/UI now implemented; focused7 backend+10 frontend tests pass, typechecks pass. New parse5@8 production dependency with lockfile is intentional. Full gate pending; first attempt stopped at formatting of existing pending docs and regenerable hook cache, now excluded. Finish full validation, genuine10-read archive smoke and browser QA; checkpoint and continue selected-pool discovery/advanced analysis and remaining team/shooting slices. Wikipedia30 standings/27 published leaders/82 playoff finals normalize successfully; no official full box score/roster/live claim. Source notices in WIKIPEDIA_DATA_NOTICE.md.

## Verified archive checkpoint; continue immediately

Full628 gate PASS (271 frontend+357 backend), genuine10-read LIVE_WIKI_ARCHIVE_ACCEPTANCE.json PASS. 30 standings/27 published leader entries/82 playoff finals/3OT,4SPArefreshes. New provider licensed CC BY-SA4.0, exact attribution, parse5 MIT; original NBA provider and original visual paths unchanged. Temporary genuine server session44411 localhost3002; QA tab2. Checkpoint commit follows browser QA. Do not stop: next selected-season similarity/discovery and historical team roster/schedule integration. Cached genuine Lakers candidate at OS temp nba-team-source-DrTdmP/lakers.json; exact Wiki/Wikidata roster query maps17/18 IDs, leave missing identity null. No roster/current/full-box-score claims until tested.

Browser QA: genuine scoreboard date2024-04-21 showed4 finals and actual game-ID navigation; game detail displayed venue/timezone warning,4 reconciled quarters and published tied leaders. Phone390x844 standings table stayed within335px container (600px content), keyboard ArrowRight scrolled it; no page overflow. Screenshot emitted in chat; viewport reset. No saved pixel-comparison claim.

## Discovery verified checkpoint (continue)

Full634 tests PASS; source2-read local LIVE_DISCOVERY_ACCEPTANCE.json PASS. `/discover` transparent selected2–4-season similarity and random qualifying targets; no new backend source or league/era claims. Checkpoint commit follows. NEXT: historical team roster/regular-results/scoped leader tables using licensed source and exact-article Wikidata identity mappings; source candidate cached in nba-team-source-DrTdmP/lakers.json. Then hypothetical five-man identity groups and additional raw shooting analysis. Do not stop at checkpoints. Local server44411/QA tab2 remains; frontend dist refreshed.
