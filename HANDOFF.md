# NBA Performance Explorer — visual assets handoff (live)

> The owner-supplied image library integrated on top of the 3.2 release candidate. Read this
> first; the 3.2, 3.1 and 3.0 handoffs below describe everything built before it.

- **Status:** READY FOR OWNER REVIEW, with limitations noted below. Not merged, not deployed, no
  pull request opened.
- **Branch:** `claude/nba-explorer-3-visual-assets`, cut from `claude/nba-explorer-3-expansion` at
  `0e184db` and pushed to `origin`.
  - Commits: `d132d5b`, `6664912` and the closing documentation commit (see `git log -1` for
    HEAD).
  - The protected branches (`main`, `codex/nba-explorer-2-engine`, `claude/nba-explorer-design`,
    `claude/nba-explorer-3-expansion`) were not touched.
- **Worktree:** clean apart from local, untracked `.claude/` settings. The raw `NBA_ASSETS`
  staging folder stays local; it is in `.gitignore` and was never modified.
- **Reports:**
  - [`docs/visual-assets/ASSET_INVENTORY.md`](docs/visual-assets/ASSET_INVENTORY.md)
  - [`INTEGRATION_REPORT.md`](docs/visual-assets/INTEGRATION_REPORT.md)
  - [`IMAGE_QUALITY_AUDIT.md`](docs/visual-assets/IMAGE_QUALITY_AUDIT.md)
  - before/after screenshots in [`docs/visual-assets/screenshots`](docs/visual-assets/screenshots)

## What changed

- **Photos replaced.** 11 of the 14 site photos were replaced by the supplied upgrades:
  Wembanyama (hero), Curry, LeBron, Giannis, Mitchell, Dončić, Jokić, Embiid, Harden, Leonard and
  Cunningham. Kevin Durant's upgrade was rejected for AI over-texturing; his sharper original is
  kept.
- **More players with photos.** 73 players now have images, up from 14: 15 editorial photos
  (Kyrie Irving is new) and 58 NBA.com headshots of current stars and 1980s–2010s legends.
- **Team marks.** All 30 current and all 15 historical marks are integrated, chosen by franchise ID
  and season and checked against the data's own team names. A season with no verified mark shows a
  neutral ring, never another era's brand.
- **One registry for each.** A single generated, ID-keyed player registry and a single
  season-aware mark registry feed these pages:
  - home, players landing, player heroes and record rooms;
  - scoreboard, game pages and standings;
  - team directory and team pages, rankings;
  - champions and awards, leaders, record book, leader movement and eras;
  - similarity, comparison, lineups and search;
  - bracket and film room.
- **Social preview and icons.** A social preview captured from the home page, and app icons from
  the existing mark.
- **New validate step.** `npm run check:visual-assets` checks files, sizes, orphans, metadata, and
  every mark era against 1,257 team-seasons of names.
- **Rebuilding.** `python -I scripts/assets/build_visual_assets.py [--skip-existing]` (Python 3
  with Pillow), then `npx prettier --write frontend/src/features/players/playerImageData.ts`.

## Verified state (final)

| Check                                                   | Result                                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm run validate`                                      | exit 0; frontend 508/508, backend 532/532, build passed                            |
| `npm run e2e`                                           | 217 passed, 0 failed, 73 skipped by design                                         |
| `npm audit`, `npm audit --omit=dev`                     | 0 / 0                                                                              |
| Production audit (port 4310)                            | 23 routes × 3 widths; no overflow, broken or enlarged images, no external requests |
| Offline demo (port 4320, all outbound requests blocked) | Every mark and face loads locally                                                  |
| Servers                                                 | All stopped at the end                                                             |

## Open decisions for the owner

1. **Publication.** No reuse permission is recorded for:
   - the NBA.com headshots;
   - the NBA and team marks;
   - the AI-upscaled editorial photos.

   They join the NBA.com data in the deployment runbook's §0 publication decision.

2. **Medium-confidence mark boundaries** (each falls back before its start), listed in the
   integration report:
   - Celtics 1998-99, Cavaliers 2022-23, Mavericks 2001-02, Pistons 1983-96, Pacers 2005-06;
   - Lakers 1983-84, Grizzlies 2004-05, Knicks 1992-93, 76ers 2015-16, Spurs 2002-03;
   - Jazz 2025-26 (the purple note supplied as current).
3. **Gaps you may want to fill.**
   - Marks of eras that were not supplied, which show neutral rings: Seattle 2001-08, Bobcats
     2007-14, New Orleans 2002-05 and 2007-08, Nets before 1997, and most 1980s–2000s marks.
   - Patrick Ewing's photo.
   - A larger hero source for 2× screens.

**Next action:** review the branch, in particular the screenshots and the Wembanyama hero. Then
decide on publication. To ship, merge `claude/nba-explorer-3-visual-assets` (it contains the 3.2
branch) through a pull request, as the deployment runbook describes.

---

# NBA Performance Explorer 3.2 — original specification completion handoff (live)

> 3.2 is the 3.1 release candidate plus the original-specification completion project on the
> same branch. Read this section first; the 3.1 and 3.0 handoffs below still describe what was
> built before.

- **Status:** READY WITH DOCUMENTED LIMITATIONS, awaiting the owner's review. Not merged, not
  deployed, no pull request opened; the public site still serves `main`.
- **Branch:** `claude/nba-explorer-3-expansion`. 3.2 commits: `68cc3c8` … `ecc5f3a` and the
  closing documentation commit (list in
  [`docs/expansion5/EXECUTION_LOG.md`](docs/expansion5/EXECUTION_LOG.md)).
- **Original specification:** 134 of 134 verified within stated scopes (3.1: 87 / 33 / 13 / 1).
  Evidence per row: [`FINAL_FEATURE_MATRIX.md`](docs/release/FINAL_FEATURE_MATRIX.md); summary:
  [`ORIGINAL_SPEC_COMPLETION_REPORT.md`](docs/expansion5/ORIGINAL_SPEC_COMPLETION_REPORT.md).
- **Data:** a digest-pinned NBA.com league archive (43 seasons, 1983-84 to 2025-26), live
  NBA.com sources on request, NBA.com's 2017-18 playoff shot zones, and award winners agreed by
  NBA.com and Wikipedia ([`DATA_INTEGRATION_REPORT.md`](docs/expansion5/DATA_INTEGRATION_REPORT.md)).

## Verified state (3.2 final)

- `npm run validate` exit 0: format, lint (0 errors, 13 baseline warnings), module-case,
  typecheck; frontend 488/488, backend 531/531; production build.
- `npm run e2e`: 217 passed, 0 failed, 73 skipped by design (mobile axe instances).
- `npm audit` / `--omit=dev`: 0 / 0.
- Production build on 4310: 70 routes at desktop and mobile width, only the expected
  bundled-mode awards and draft states. Offline simulation on 4320: every archive page works;
  live pages and the status board report NBA.com as unavailable.
- All servers stopped at the end.

## New in 3.2 (routes and endpoints)

| Route                                             | Endpoint(s)                                                                            |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `/standings?season=`                              | `GET /api/league/seasons`, `/standings`, `/standings/current`                          |
| `/leaders`, `/leaders/teams`, `/leaders/movement` | `/leaders`, `/team-rankings`, `/movement`, `/distribution`                             |
| `/teams/:id?season=`                              | `/teams/:teamId`                                                                       |
| `/games`, `/games/:id`                            | `/games`, `/calendar`, `/snapshot`, `/games/:id`, `/games/:id/play-by-play`, `/status` |
| `/history/record-book`                            | `/records`                                                                             |
| `/history/eras`                                   | `/eras`, `/era-players`, `/player-search`                                              |
| `/history/champions`                              | `/honours`                                                                             |
| `/players/:id/records`                            | `/players/:playerId`                                                                   |
| `/lab/lineups/nba`                                | `/lineups`                                                                             |
| `/lab/shots` (league columns)                     | `leagueBaseline` in `GET /api/shots`                                                   |

Rebuild scripts (run by hand only, spaced and cached): `build-league-archive.ts`,
`build-league-extras.ts`, `build-league-honours.ts`; `reconcile-boxscorelab.ts` repeats the
cross-check against local CSVs that are never committed.

## Open decisions for the owner (3.2)

1. **Publication of NBA.com-derived data.** Used under the owner's accepted risk; no licence is
   held. Decide before merging whether the public site ships it
   ([deployment runbook §0](docs/release/DEPLOYMENT_RUNBOOK.md)).
2. **Render availability of NBA.com.** The live features have not been checked from a cloud
   host.
3. **Eddie Johnson, 1988-89 Sixth Man.** NBA.com lists no awards for him, so the award is shown
   as a gap; adding it would need a second source the owner accepts.

---

# NBA Performance Explorer 3.1 — completion sprint handoff (live)

> 3.1 is the 3.0 release candidate plus an overnight completion sprint on the same branch. The
> 3.0 handoff below still describes everything built before 3.1; read this section first.

- **Status:** READY WITH DOCUMENTED LIMITATIONS, awaiting the owner's review. Not merged, not
  deployed, no pull request opened; the public site still serves `main`.
- **Branch:** `claude/nba-explorer-3-expansion` (no new branch). 3.1 commits: `f05fb89`,
  `8c6e5b5`, `ca601e3`, `4d62922`, `46d69ad`, `969873e`, `f06e68f`, and the closing
  documentation commit.
- **Evidence:** [`docs/expansion4/VERIFICATION_LOG.md`](docs/expansion4/VERIFICATION_LOG.md),
  [`GAP_CLOSURE_PLAN.md`](docs/expansion4/GAP_CLOSURE_PLAN.md),
  [`DATA_SOURCE_AUDIT.md`](docs/expansion4/DATA_SOURCE_AUDIT.md) and the updated
  [`FINAL_FEATURE_MATRIX.md`](docs/release/FINAL_FEATURE_MATRIX.md) (87 / 33 / 13 / 1 of 134;
  3.0 was 83 / 37 / 13 / 1).

## Completed in 3.1

| Commit    | Scope                                                                                                                |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| `f05fb89` | Live Wikipedia parsing fixed after the parse API switched to Parsoid links (awards and draft returned 502 live)      |
| `8c6e5b5` | P0: game research defaults to the latest season; film room save keeps the game; story embeds paced; test reliability |
| `ca601e3` | Gap-closure plan formatting                                                                                          |
| `4d62922` | Data Coverage Explorer `/explore/coverage` and `GET /api/coverage` (H11, I11)                                        |
| `46d69ad` | Source-listed position filters on recorded leaders and Workbench cohorts (E08, H05)                                  |
| `969873e` | BoxScore Lab audit: data quality passes, licence fails, not integrated                                               |
| `f06e68f` | Totals panel test renders inside a router (regression from the coverage link, caught by the full run)                |

## Verified state (3.1 final)

- `npm run validate` exit 0: format, lint (0 errors, 13 baseline warnings), module-case,
  typecheck; frontend 457/457, backend 468/468; production build.
- `npm run e2e`: 172 passed, 0 failed, 58 skipped by design (mobile axe instances).
- `npm audit` / `--omit=dev`: 0 / 0.
- Production build on 4310: 55 routes audited at desktop and mobile width (bundled and live
  archive modes); awards and draft answer live; offline simulation on 4320 verified (19 routes).
- Servers: the presentation server was stopped at the end of the sprint.

New in 3.1: `GET /api/coverage` (no parameters); `position=G|F|C` on `/api/recorded/leaders` and
`/api/recorded/workbench` (players only); leader rows carry optional `positions`; responses
carry `positionUnlistedPlayers` and, when filtered, `positionScope`. Saved-research paths allow
`/explore/coverage`.

## Open decisions for the owner (3.1)

1. **Roster identity refresh.** Live team pages now add article URLs for 8 teams' rosters that
   the snapshot has as null. A re-snapshot with `backend/src/scripts/build-recorded-snapshot.ts`
   would change identity and cohort counts, so it was not done during the sprint.
2. **BoxScore Lab.** Integrate only with written confirmation that NBA Stats data may be
   redistributed (see the audit, §5).
3. **Optional features not started** (P3): Time Machine, player evolution, rivalry view,
   advanced shot comparison, reader-weighted similarity. None was begun, by design.

---

# NBA Performance Explorer 3.0 — release candidate handoff

> The handoff for the 3.0 expansion. The 2.0 redesign handoff and the original Codex
> engineering handoff follow below unchanged and stay authoritative for their scope.

- **Status:** release candidate, **READY WITH DOCUMENTED LIMITATIONS**, awaiting the owner's
  review. Not merged, not deployed: the public site still serves `main` (`cd557e4`).
- **Start here:** [`docs/release/RELEASE_READINESS.md`](docs/release/RELEASE_READINESS.md), then
  [`DEMO_RUNBOOK.md`](docs/release/DEMO_RUNBOOK.md),
  [`DEPLOYMENT_RUNBOOK.md`](docs/release/DEPLOYMENT_RUNBOOK.md),
  [`FINAL_FEATURE_MATRIX.md`](docs/release/FINAL_FEATURE_MATRIX.md) and
  [`PRODUCT_OVERVIEW.md`](docs/release/PRODUCT_OVERVIEW.md).
- **Branch:** `claude/nba-explorer-3-expansion`, cut from the approved 2.0 checkpoint `0aa2717`.
  Never commit to `main`, `codex/nba-explorer-2-engine` or `claude/nba-explorer-design`; no
  merge or deploy without the owner (the runbook describes a squash merge).
- **HEAD:** see `git log -1`; every verified stage commit is listed below.
- **Working tree:** clean after each commit (a local, untracked `.claude/launch.json` preview
  config may exist on the development machine; never commit it).
- **Evidence:** `docs/expansion3/VERIFICATION_LOG.md` (per-stage results) and
  `docs/expansion3/FEATURE_INVENTORY.md` (inventory and backlog).
- **Design:** the Arena & Film Room system is final. New modules reuse its tokens, slates,
  tapes, scoreboard/statgrid/ladder modules and motion primitives; new CSS lives in
  `frontend/src/design/intel.css` and `playoffs.css`, with additions in `studio.css` and
  `history.css`.

## Completed in 3.0

Session one (`fd2d2c0` … `b96e4d4`): security (16 → 0 audit findings), team season intelligence,
standings race (three views), 2024 bracket with published seeds and series context on game
pages, Shot Studio distance/zone/efficiency/saved views, player hub "2023–24" room with similar
seasons, two-team duel, search over archive players, My NBA research board with notes, Formula
lab, 2023–24 season hub, team wall records and the homepage "New in the film room" band.

Session three — finalization (`50d4b90` … this commit):

| Commit    | Scope                                                                                 |
| --------- | ------------------------------------------------------------------------------------- |
| `50d4b90` | Playoff Series Film Room `/games/series/:id`; committed playoff/season table snapshot |
| `e062351` | Statistical Story Builder `/my-nba/stories` (editor, reader/print, JSON, share link)  |
| `bbb7ca1` | Spec gaps: series/game search, leader player links, comparison CSV/SVG; `/tour`       |
| `93499a5` | Team panel snapshot fallback; `scripts/start-presentation.ps1` and stop script        |
| final     | Release docs, matrix, README, screenshots, player error copy, test timeouts           |

New in session three: `GET /api/games/series/:seriesId`; `WIKI_ARCHIVE_MODE=live|bundled`;
`backend/src/features/wiki-archive/archive-snapshot.json` (rebuild with
`npx tsx backend/src/scripts/build-archive-snapshot.ts --write`); stories in browser key
`nba-explorer.stories.v1`; saved-research paths allow `/games/series/:id`.

Session two (`a1c672b` … `7b56586`):

| Commit    | Scope                                                                          |
| --------- | ------------------------------------------------------------------------------ |
| `a1c672b` | Efficiency view recoloured by points per attempt (FG% misled on threes); tests |
| `e8cd484` | e2e covers the efficiency view; full run 142 passed, 0 failed                  |
| `c3e241c` | 2022-23 audited and **not ingested** (10/30 clean pages); season-aware parser  |
| `c8a1b99` | Research Workbench `/lab/workbench` (players/teams, rank/distribution/relate)  |
| `682de4d` | Comparison Studio `/compare/recorded`: gap board, statements, exact values     |
| `45c495c` | Shot Studio court region: drag or numeric bounds, URL, outline, exports        |
| `2d22dc0` | My NBA collections: tag, filter, rename, dissolve, export one collection       |
| `899801f` | Similarity Finder `/discover/similar` on 2–9 reader-chosen measures            |
| `7b56586` | Workbench: furthest above and below the fit line (residuals)                   |

New APIs this session: `GET /api/recorded/workbench`, `/api/recorded/player-comparison`,
`/api/recorded/similarity`; `/api/shots` accepts `region`. Contract changes: density cells gain
`pointsPerAttempt`; shot responses carry `region`; bookmarks gain optional `tags`; recorded
contracts use `RecordedSeasonSchema` (still `['2023-24']`). Saved-research paths now allow
`/discover/similar`.

## Verified state (final)

- Format, lint (0 errors, 13 pre-existing warnings), module-case, typecheck: pass. Frontend
  448/448, backend 457/457, production build: pass.
- `npm run e2e`: 169 passed, 0 failed, 57 skipped by design (desktop-only axe), desktop and
  mobile.
- Production build served locally; 20 routes refreshed with all external browser requests
  blocked; offline simulation of the server verified (see the demo runbook for what works).
- `npm audit` and `npm audit --omit=dev`: 0 vulnerabilities.
- On this host, full runs can fail by timing alone under heavy load; tests now wait longer
  (async 4 s; frontend 15 s and backend 20 s per test). No assertion was weakened.

## Constraints and data notes

- NBA Stats timed out from the development machine in sessions one and two and answered at the
  final session-three check (send the app's own headers; a bare curl times out). New work uses the
  committed recorded archives and the committed playoff snapshot. Quarantined games keep their slot but never get
  a score. Rest, streaks and rolling margins are withheld when chronology is unknown.
- Bracket winners require a fourth win in the series' last recorded game; rounds are derived
  from team series order and cross-checked against NBA game-ID round digits. Seeds come
  only from the published series headings and are accepted only when consistent.
- Similar seasons are equal-weight z-score distance in a stated cohort; the UI calls them a
  resemblance, never a quality judgement. Recorded leaders use the archive's games rule, not the
  official one, and say so.
- Tests that were re-expressed (never weakened) are listed in the log: the Shot Studio title
  count and the search "warriors" option.
- Commits carry no AI co-author trailer (owner preference).
- npm 10.9.3 crashes on `npm update` (arborist edgesOut); use `npx npm@11 update <pkg>` for
  targeted updates, then `npm ci` with the project npm.

## Next actions (in order)

1. **Owner:** run `scripts/start-presentation.ps1`, follow the 7-minute route in the demo runbook,
   and read `RELEASE_READINESS.md`.
2. **Owner:** open a pull request into `main`, wait for CI, then squash merge when satisfied
   (`DEPLOYMENT_RUNBOOK.md`); verify NBA.com availability on Render afterwards.
3. Later engineering (not needed for release): reader-weighted similarity and similar team
   seasons; a field-by-season coverage explorer (H11/I11); re-audit 2022–23 if Wikipedia's team
   pages are repaired (parser and audit script ready).

Continuation: `git checkout claude/nba-explorer-3-expansion && npm ci && npm run validate`.
For live checks run the backend on 3001 (`PORT=3001 npm run dev:backend`) and the frontend with
`npm run dev:frontend`; `npm run e2e` reuses those servers.

---

# Shot 2 — Arena & Film Room redesign (Claude design branch)

> This section is the live handoff for the redesign. The engineering handoff below it is the
> original Codex closeout and stays authoritative for the engine, sources and contracts.

- **Branch:** `claude/nba-explorer-design`. The engineering baseline is `b4e5f88`.
  - The original history is preserved; never rebase, reset or rewrite it.
  - Never commit to or merge into `main`. Nothing has been deployed.
- **Approved direction:** A, Arena & Film Room. B and C were rejected visually. C's linked
  charts, brushing and filtering are reused in A's language only.
- **Evidence:**
  - `docs/redesign/VERIFICATION_LOG.md` holds per-stage results, test re-expressions and the
    bundle record.
  - `e2e/` holds the Playwright smoke and axe suites. Run them with `npm run e2e`, which needs
    `npm run dev` with ports 5173 and 3001 free.

## Stage status

| Stage | Scope                                                                        | Status |
| ----- | ---------------------------------------------------------------------------- | ------ |
| 0     | Baseline, harness, dependencies                                              | Done   |
| 1     | Tokens, fonts, motion system, primitives, chart kit                          | Done   |
| 2     | Global shell: masthead, nav, search, footer, Film Room frame, 404            | Done   |
| 3     | Player hub (overview, form, games, career, shooting), Recharts removal       | Done   |
| 4     | Shot Studio (court, dots/density/zones, linked table, export by stable ref)  | Done   |
| 5–8   | Compare suite; teams/games/standings/leaders; seasons/history; labs          | Done   |
| 9     | Homepage, landings, My NBA motion setting, "What's on tape" coverage page    | Done   |
| 10    | Route sweep, keyboard walkthrough, transform-only audit, copy, bundle record | Done   |

The redesign scope is implemented and verified across all 39 route examples (35 route
templates plus home, landings and the catch-all).

Final verified state:

- `npm run validate` exits 0: 347 frontend and 413 backend tests pass, lint has 0 errors, and
  typecheck and builds pass.
- Playwright passes 118/118. Smoke passes 78/78 on desktop and phone. Axe passes 40/40
  scans (39 routes plus the homepage loading state) with zero serious or critical
  violations.
- Initial JS is 196.5 kB gzip, against 235.2 kB at baseline.

## Continuation instructions

1. Check out `claude/nba-explorer-design` with a clean `git status`.
   - Run `npm ci` if `node_modules` is missing.
   - `npm run validate` must pass before and after any change.
2. The building blocks live in `frontend/src/{design,motion,ui,charts}`.
   - Research pages render inside `ResearchShell`, which provides the `.fr` Film Room scope.
   - Arena moments use `KineticHeadline`, `Reveal` and `Stagger`.
   - Chart marks animate from `useSeen()`, which reports true at once when motion is off.
3. Keep accessible names and copy that tests pin; see the test re-expressions in the
   verification log.
   - Re-express colour or geometry assertions as `data-*` hooks rather than deleting them.
   - Never add URL params outside the backend contracts.
4. Module names must not differ only by case. `court.ts` (geometry) and
   `BasketballCourt.tsx` (component) once shared the stem `Court`/`court`, and that blanked
   the app on Windows. `npm run check:module-case`, part of `validate`, fails on any such
   collision and on any import that resolves differently on a case-insensitive filesystem.
5. Run Prettier from the repository root (`npx prettier --write <paths>`). Run from a
   workspace folder, it misses `.prettierignore` and reformats the immutable
   `lineup-study-snapshot.json`.
6. Animate only `transform` and `opacity`, and never set React state per frame. Use motion
   values for scroll and pointer effects.
7. After each change, append its results to the verification log. Commit with the session
   trailers and push with `git push -u origin claude/nba-explorer-design`.

## Known limitations and open items

- **Initial focus.** Every page focuses its `h1` on entry, including the first load. This is
  an inherited contract pinned by baseline tests. The skip link and masthead are therefore
  reached with Shift+Tab from the heading.
- **Peak-season picker.** Its summary still reads "Choose a qualified peak season for NBA player
  {id}". A test pins the text verbatim, so it should be changed only together with that test.
- **Backend copy.** The run-together spacing defects are fixed. Beyond that, some engine copy
  stays dense ("regular finals", slash lists) and was left for its owners.
- **Demo-mode career data.** The fixture provider has no career raw totals, so career curves
  and career tables are empty in demo mode. This is a data limit; the page says so.
- **Search focus test.** The handoff of focus to the destination after a search choice is
  verified in Chromium only. jsdom skips the exit animation, so it cannot reproduce that
  ordering.
- **CSS size.** CSS grew from 8.8 kB to 23.7 kB gzip, the cost of the design system.
- **Lint warnings.** Lint reports 13 react-refresh warnings for modules that export constants
  alongside components. There are no errors.
- **Production checks.** Production-host reachability and deployment are not verified, and are
  not authorized on this branch.
- **Fixed: Windows startup failure.** The app was blank on Windows at `436cb60`, caused by
  `charts/Court.tsx` sitting beside `charts/court.ts`. It is fixed by renaming the
  component to `BasketballCourt` and is guarded by `check:module-case`. Details are in the
  verification log's hotfix entry.
- **Cold-start preview race.** Opening the homepage before the backend listens can leave the
  game preview saying its archive is unreachable until a reload. The page itself renders.
- The motion preference, item L10 in the Codex ledger, is now delivered on My NBA.

---

# NBA Performance Explorer 2.0 — Engineering Handoff

## Snapshot timestamp / branch / HEAD / base commit

Closeout completed on 2026-10-15 Australia/Sydney. Branch `codex/nba-explorer-2-engine`. Validated engine HEAD: `2561a17a2700b6f14fbed2cac727acfac1b09fdd`; the final documentation commit follows that checkpoint. Resolve the actual checkout HEAD with `git rev-parse HEAD`; the delivery report gives the final documentation SHA. Protected baseline: `cd557e4d3cf75e44f930ba75de4ea149a80ccdda`.

## Working tree and pending changes

All engineering changes are committed. Final documentation and audit evidence are the only changes being sealed by the closeout commit; no unfinished feature implementation remains. Confirm `git status --short` on receipt: the final delivery checks it after committing. Ignored local validation logs are not required for Cloud. No reset, discarded source work, stash, merge, push or deployment was performed.

## Goal and non-negotiable constraints

Shot 1 feature expansion is officially closed. This is the stable foundation for Claude Code Cloud Sessions to design and implement approved Shot 2 frontend work through GitHub. Do not resume old expansion instructions in the archived journal/master specification. Preserve source contracts, calculations, qualification, missingness, provider boundaries and attribution. No invented statistics, required paid services, restriction bypass or unapproved production action. Original visuals remain protected until the owner approves specific Shot 2 changes.

## Verified baseline and last validation results

`npm run validate` PASS after the final SVG repair: 737 tests, comprising 324 frontend tests in47files and413backend tests in41files; all formatting, lint, typechecks and production builds pass. Original434tests remain. No tests were removed or timeouts weakened. Frontend two-worker cap remains; the new team test preloads its subject before assertion timers to avoid cold module compilation affecting UI timing.

Genuine local evidence: `npm run smoke:engine` PASS16reads; `npm run smoke:closeout -- --write-report` PASS87reads (46contractAPIs,36SPArefreshes,5invalid/methodcases), realCSVcontent and exact source/dist asset hashes. Genuine shotSVG metadata/XML-reopen PASS. All35registered route templates plus home rendered in bounded browser checks. Reports are committed under `docs/expansion/CLOSEOUT_*`.

## Completed commits and shipped-on-branch vertical slices

All historical branch checkpoints remain intact. Last prior checkpoint5810907 delivered common-cohort profiles. Closeout commits:

- `121d4baf683e2286a9400bf0ae0d92a27db61853`: finished historical team rankings/splits, source-backed conference facts, source capability reporting, tests and bounded genuine acceptance harness.
- `2561a17a2700b6f14fbed2cac727acfac1b09fdd`: fixed invalid SVG duplicate namespace declarations and strengthened XML-reopen tests/evidence.
- Final documentation commit: this handoff, complete Claude inventory/setup, source notices, release notes, accurate134-item ledger and preserved archives. Its SHA is resolved from Git and reported at delivery.

Working modules include explorer; player rolling/split/raw/career/shooting research; selected/career/normalized comparisons; historical teams/results; playoff games/quarters; standings/leaders/recorded rankings; historical facts/awards/draft/records/calendar/progression; genuine shot maps/density/shooting tables; research lineup time/PM; discovery; local favorites/named links/preferences/recent history. Every route/control/source limit is listed in DESIGN_HANDOFF_FOR_CLAUDE.md; all public APIs in API_CATALOG.md.

## Current milestone and exact in-progress task

Engineering closeout is complete. There is no next feature implementation. Publish only the completed development branch **after explicit owner approval and watched-branch review**, then let Claude inspect the repository and propose supervised Shot 2 design. Production release is a later, separately authorized audit.

## Feature ledger summary (counts by status)

Exactly134requirements: **77VERIFIED,41PARTIAL,14BLOCKED,2DEFERRED**. All master IDs match one-for-one; machine-readablecounts in CLOSEOUT_FEATURE_COUNTS.json. Six earlier verified claims were reduced (A10,B10,B13,C08,F10,H11). Upcoming/current league capabilities A05/A08 are blocked. I06 historical franchise mapping is deferred because a permitted candidate exists but was not integrated; L10 motion preference is deferred. Verified means the complete behavior within its stated supported scope, not comprehensive/current/all-time NBA coverage.

SHOT_1_ENGINE_STATUS=WORKING_BUT_INCOMPLETE. READY_FOR_CLAUDE_DESIGN=YES for supervised work on the stable existing engine; this does not certify all module minimums or production readiness. D full match center and E current/full league remain incomplete; broader historical/lineup/era scopes remain limited.

## Data sources (verified, conditional, blocked, rejected)

- Existing NBA.com four endpoint families preserved; genuine local engine flows passed. Network availability, empty rows, broad source rights and actual Render/Cloud access remain conditional.
- Wikipedia CC BY-SA4.0: fixed2023-24league/team tables,2024playoff finals,2023draft; exact revisions/contributors/licence/adaptation notices. Wiki client uses33allowedtitles,10s/2MB/24hboundedcache/Retry-After, no retries.
- WikidataCC0: historical season/champion facts and exact article/NBA-ID enrichment; missing facts/modern franchise labels remain explicit, no fuzzy mapping.
- Genuine recorded2023-24archive:30sources,639regularrows/29scopedteams,18Chicago unknown-scope rows;1219agreedfinals/nineconflicts/twounpaired quarantines; common363GP20defaultcohort, not complete league.
- BoonP/KaggleCC0:13,470attempts/6143makes/203players/16teams/80games, partial2018playoffs. Original CSV/hash, geometry and licensing preserved.
- ArnaudOdet/DataverseEtalab2 author-derived2017-18research:13,867groups/1229games/540nativeBRIDs; one missing-period game/two exclusive groups quarantined. No rawPBP/code/pickle reuse, guessed NBA IDs or possession ratings.
- Broad NBA/CDN/ESPN/PBP routes remain rights/input blocked. MIT libraries do not license upstream datasets. No automatic fixture substitution, evasion, paid database or scheduler.

## Architecture and important decisions (with file pointers)

App.tsx registers additive lazy routes; original render trees/assets/provider remain unchanged. ResearchShell/research.module.css provide separate scoped UI. Shared Zod contracts in packages/contracts validate boundaries. Backend app/server compose independent optional providers; research services own raw math/source budget; recorded providers reuse immutable data and paired-game reconciliation. Frontend math helpers remain outside visual rendering. Local My NBA uses versioned internal URLs, strict caps, session recovery and separate opt-in recent key. Full architecture/styling/component inventory and data invariants are in the Claude handoff; operational details in OPERATIONS.md.

## Files changed in current work session

Interrupted team feature contracts/provider/router/UI/tests and source conference JSON; app capability plumbing/explorer text; SVG export helper/regression; opt-in smoke-closeout.ts/root script; final genuine/browser/export/count reports. Documentation: rootHANDOFF, README, architecture/state/decisions, all essential expansion audit/catalog/calculation/source/operations/design/release/verification documents. Original journal preserved in SHOT1_EXECUTION_JOURNAL.md and original specification in SHOT_1_MASTER_SPEC.md, explicitly marked archival/superseded.

## Tests and exact commands/results

- `npm run validate`: final PASS737, including final SVG namespace regression.
- `npm run smoke:engine`: PASS16genuine local reads and raw formula/rolling/comparison checks.
- `npm run smoke:closeout -- --write-report`: PASS87bounded genuine API/SPA/error/hash/CSVchecks after the production build.
- Focused team suites:4backend/3frontend cases PASS; source capability regression included in21-case suite PASS; shot UI/export suite5cases PASS.
- Literal Node ESM/jsdom genuine SVG check:261Curryfilteredattempts/hash/licence metadata and validXML PASS; no browser download wait.
- `git diff --check`: PASS.134uniqueledger IDs match archivedspec exactly; documentation links checked. Protected paths have no diff againstcd557e4.
- Local production config starts with NBA genuine provider, fixtures forbidden and builtSPA; actual host/remoteCI not tested or deployed.

## Known bugs, security concerns and reliability limitations

No confirmed unresolved critical calculation, route or export bug after closeout. Genuine checks found and repaired team frontend query mismatch and duplicateSVGxmlns. A few ad-hoc harness/selector/quoting mistakes were corrected without weakening application checks, and are recorded in VERIFICATION_LOG.md.

Release risks: production-host/Cloud egress, cold starts and memory remain unverified; local server working set128.7MB after genuine flows is not cloud certification. Original shared/Recharts646KBchunk warning remains. No public rate limiter or durable server cache added. Immutable integrity-checked asset corruption intentionally prevents startup. Historical cohorts are incomplete, not live/official; research lineups are reconstructed and lack possessions/on-off. Original masthead anchors/footer/metadata retain static live branding and need approved design integration. No same-fixture pixel equality test.

## Protected original UI baseline and visual check status

Original protected frontend files/assets/metadata/screenshots, originalbackendplayers andrender.yaml diff is empty againstcd557e4. Original tests remain. Actual original home/profile/compare and all expansion templates rendered at390x844; document375px/controlsfit/tablecontainersscroll. Default desktop width1280/document1265 tested for final team navigation. Viewport reset. ORIGINAL_VISUAL_DESIGN=unchanged_diff_only; no pixel-equality claim or redesigned baseline.

## Next task queue (ordered)

1. Owner confirms Render watchedbranch will not auto-deploy the developmentbranch, approves publication and executes the explicit safe branch commands in OPERATIONS.md.
2. Review GitHub CI, grant Claude Cloud repository/branch access; start a separate Shot2branch.
3. Claude reads this file and DESIGN_HANDOFF_FOR_CLAUDE.md, runs validation, inspects real supported pages and proposes designs for human approval.
4. Implement only approvedfrontendwork, preserving engine contracts/math/source/coverage and protected originals until specific approval.
5. Separately authorize future production release validation. Do not restart deferred source expansion during design.

## Single NEXT ACTION

Review `docs/expansion/DESIGN_HANDOFF_FOR_CLAUDE.md`, then approve development-branch publication only after confirming Render’s watchedbranch. No push command has been executed.

## Continuation prompt for a new Codex session

Shot1isclosed. Read currentGit,HANDOFF,FEATURE_LEDGER,Claudehandoff and source notices. Preserve the validated engine and all progress. Do not resume archived feature queues, redesign protected pages without approval, invent data, spend money, merge, push or deploy. ClaudeCloud owns supervisedShot2design/approvedfrontendimplementation on the published developmentfoundation; execute only the owner’s next explicit task.
