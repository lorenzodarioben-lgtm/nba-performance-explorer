# NBA Performance Explorer 3.0 — verification log

Branch `claude/nba-explorer-3-expansion`, cut from the approved NBA 2.0 design checkpoint
`0aa2717`. Entries are appended in order; each records what was run and the exact result.
Earlier history: `docs/redesign/VERIFICATION_LOG.md` (2.0 redesign) and
`docs/expansion/VERIFICATION_LOG.md` (Codex engine).

## Environment notes (this machine)

- Windows 11, Node 22.19.0, npm 10.9.3. Git Bash rewrites bare `/path` arguments into Windows
  paths; pass URL paths without a leading slash to local scripts.
- NBA Stats (`stats.nba.com`) timed out from this machine (one bounded probe, 15 s), so features
  that need it can only be exercised in labelled demo mode here. Wikipedia was reachable.
  New work therefore builds on the committed genuine archives (recorded 2023-24 snapshot, 2018
  shot archive, 2017-18 lineup study) and the Wikipedia-backed 2024 playoff snapshot.
- Visual checks use a Playwright script that scrolls the page first so scroll-triggered
  entrances fire, then captures full pages or single modules at 1280 and 390 px.

## Stage 0 — audit and security

- Baseline on `0aa2717` after `npm ci`: `npm run validate` **failed** at
  `check:module-case --self-test` (2 of 5 self-test cases) on Windows only. Cause: `os.tmpdir()`
  returned the 8.3 short path `C:\Users\LORENZ~1\…`; the checker walks real directory listings,
  which never contain `LORENZ~1`, so every import lookup returned null. Fix: canonicalise the
  self-test root (and repo root) with `realpathSync.native`. No check weakened; all five cases
  and the repository scan pass.
- `npm audit`: 16 findings (2 critical, 10 high, 4 moderate). Production-reachable: `proxy-addr`
  2.0.7 and `qs` 6.15.2 (via express), `react-router` 7.18.0. The rest were dev/test tooling
  (vitest/@vitest/mocker, playwright, concurrently/shell-quote, postcss, undici via jsdom,
  browserslist, nanoid, brace-expansion, source-map-js, baseline-browser-mapping).
- All fixes are semver-compatible updates inside existing ranges (no `package.json` change):
  proxy-addr 2.0.8, qs 6.16.0, react-router 7.18.4, vitest 4.1.11, @playwright/test 1.64.1,
  concurrently 10.0.6, postcss 8.5.30, undici 7.30.0. npm 10.9.3 crashes in arborist
  (`#loadPeerSet … edgesOut`) on any update, so the targeted `update` ran under npm 11.6.2;
  `npm ci` with npm 10 then reinstalls cleanly and `npm audit` reports **0 vulnerabilities**
  (full tree and `--omit=dev`).
- After both fixes: `npm run validate` **exit 0** — 347 frontend / 413 backend tests.
- Commit `fd2d2c0`.

## Stage 1 — team season intelligence and the standings race

- New endpoints `GET /api/recorded/team-season?team=` and
  `GET /api/recorded/standings-race?conference=`, pure domain module
  `backend/src/features/recorded-archive/recorded-team-season.ts`.
- Genuine-data cross-checks (test): for all 30 teams the season's all/home splits equal the
  existing team-ranking summaries, monthly splits sum to the season, race end records equal
  the season record, scheduled-through reaches 82, quarantined IDs match unverified games.
- A unit test found a real bug before commit: the top margin bin dropped a margin that was an
  exact multiple of five (`hi` was `ceil`, bins are half-open). Fixed.
- Visual: Boston 2023-24 page at 1280 and 390 px (ribbon, focus filter, game card, record path,
  split board, margin bins, season series, ledger); East race at 1280 and 390 px. Issues found
  and fixed: selected bar indistinguishable from wins (now white), dense LineChart markers
  burying the line (markers shrink when points are under 12 px apart), stray list bullets on
  series plates, ladder buttons inheriting uppercase Film Room button styles, colliding month
  labels. No horizontal overflow at 390 px; no console errors.
- `npm run validate` **exit 0**: 362 frontend / 421 backend tests. Commit `a9c6d0b`.

## Stage 2 — 2024 playoff bracket and series explorer

- New endpoint `GET /api/games/bracket`, derivation in
  `backend/src/features/wiki-archive/playoff-series.ts`.
- Live source check (Wikipedia, revision 1376206465): 82 games → 15 decided series, rounds
  8/4/2/1, every game ID's round digit agrees, no issues, champion BOS (16–3, Finals 4–1 vs DAL).
  Matches the historical record.
- Visual: bracket at 1280 (mirrored tree with rules, champion banner, DEN–MIN series story) and
  390 px (rounds stacked from the Finals). No overflow or console errors.
- `npm run validate` **exit 0**: 367 frontend / 427 backend tests. Commit `7e8e2cb`.

## Stage 3 — Shot Studio expansion

- Backend: every shot group carries `meanDistanceFeet` and an 11-bin distance profile (3-foot
  bins to 29 ft, then 30+) over every filtered attempt. Curry's 261 attempts reconcile exactly
  across bins (attempts, makes, three-point attempts); ratios obey the existing minimum-attempts
  rule.
- Frontend: per-panel distance profile on a shared scale with an exact table; clickable court
  zones plus an equivalent zone-button row; a two-player zone strip on one shared scale
  (MirrorBars gained opt-in `sharedMax`); named saved Studio views in local My NBA storage;
  `keepPreviousData` so filters refine in place with an "Updating shots…" status.
- Visual: Curry vs LeBron in Zones at 1280 px. Issues found and fixed: colliding distance
  labels; per-row scaling made a 0.4 % backcourt share draw as a full bar (now shared scale);
  wrapped value labels.
- Re-expressed assertion: a pinned `svg title` count now targets the court SVG (`svg.shotcourt
title`), the same two shot marks.
- `npm run validate` exit 0: 371 frontend / 428 backend. Commit `46e5e67`.

## Stage 4 — player 2023-24 recorded season room

- `GET /api/recorded/player-season`; profile column building factored out of `profiles()` so
  the card and the percentile-profiles page share one computation (a test asserts equality).
- Live checks: Curry, LeBron, Gilgeous-Alexander, Bey, Jokić qualify (cohort 363 at 20 GP);
  Siakam (traded, raw totals on both rows) qualifies; Anunoby (traded, NYK row lacks raw
  totals) is excluded with that exact reason; an unknown ID is "not in the archive".
- Visual: Jokić room at 1280 px — percentile board, published DEN row, eight similar-season
  cards with signed z-difference bars.
- `npm run validate` exit 0: 375 frontend / 432 backend. Commit `dd29902`.

## Stage 5 — search reach and the My NBA research board

- Search adds recorded-archive players (opening their 2023-24 room), accent-insensitive
  matching, team-season shortcuts and tool keywords.
- My NBA: search/filter/sort board with destination labels, rename and optional 500-character
  notes (schema stays version 1; earlier exports still import).
- Re-expressed assertion: the pinned "warriors" search test now names the "Team hub" option
  and checks the new season option is listed.
- `npm run validate` exit 0: 380 frontend / 432 backend. Commit `0526b32`.

## Stage 6 — browser suites on the new routes

- `e2e/routes.ts` gains five 3.0 routes (team season, race, bracket, player archive room,
  Studio zones with two players).
- First run: 129 passed, 4 failed — all genuine and fixed:
  - `definition-list` (serious) on the team season and player room: notes were `<p>` inside
    scoreboard `<dl>` groups; now `<dd>`.
  - The player archive room had no `h1` when the hub had no profile (demo fixtures lack the
    player; NBA Stats down would do the same). The room now renders inside `ResearchShell`
    like every other hub room.
- Bundle (initial `index.html` preloads, gzip): JS 197.2 kB (2.0: 196.5 kB), CSS 26.8 kB
  (2.0: 23.7 kB). New pages are lazy chunks of 3.5–5.6 kB gzip.
- After the fixes: full `npm run e2e` **133 passed, 0 failed** (45 skipped by design: the axe
  scan runs once, at desktop width). The 2.0 baseline was 118; the 15 new checks cover the five
  3.0 routes on desktop and phone plus their axe scans.

## Stage 7 — 2023-24 season research hub

- `/history/2023-24` gains a research hub: four research paths whose opening facts are read live
  from existing endpoints (best observed record → team season and race; champion's run →
  Finals series and bracket; recorded scoring leader → player room and profile; highest-scoring
  game → both team seasons and records), each loading and failing on its own, plus a grid of
  every 2023-24 tool.
- Live values: BOS 63–18 in 81 agreed games; BOS 16–3, Finals 4–1; Embiid 34.7 PPG in 39 games
  among 363 players with 20+ recorded games (the card states the official title used a stricter
  rule); IND 157 at ATL 152 on Nov 21, 2023, 309 combined points.
- Visual fix: card padding was overridden by the list reset; selector specificity corrected.
- `npm run validate` exit 0: 382 frontend / 432 backend. `npm run e2e`: 133 passed.

## Stage 8 — two-team season duel (`4a797d0`)

- `/lab/teams` adds both teams' games-above-.500 paths on one chart and every shared split on
  one 0–100% scale, sharing the team-season query cache. BOS 63–18 vs DEN 57–24 observed.
- Tests: 2 frontend cases (shared splits only; one failing team shows an error, not half a
  comparison).

## Stage 9 — series context on game pages (`c328062`)

- Each playoff game page shows round, game number, series score after the game (or the clinch),
  a linked strip of the series' games and a bracket link. Finals Game 5: "BOS wins the series
  4–1".
- Axe caught red winner labels at 4.41:1 on the lighter current-game fill; the current game is
  now framed instead. Game page, bracket, duel and 2023-24 hub scan clean.

## Stage 10 — Formula lab (`d6c19dd`)

- `/lab/formulas`: 16 derived metrics (10 added in 3.0) with formula, definition,
  missing-data rule, worked example, implementing module and usage links; area and search in
  the URL. Every worked example was re-derived by hand; one (similarity distance) was corrected
  from 2.78 to 2.85 before commit.

## Stage 11 — race views and opponent quality (`bd152bc`, `4d43aac`)

- Standings race gains games-behind and ladder-rank (bump chart) views with 6th/10th rules;
  hand-checked series incl. ties.
- Team seasons split by opponent quality (observed win % above/below .500). Genuine
  reconciliation for all 30 teams; the rebuilt agreed-game list equals the documented 1219.

## Stage 12 — published playoff seeds (`809e86f`)

- Seeds are parsed from the series headings of the already-licensed "2024 NBA playoffs" page and
  accepted only if consistent; the live bracket carries all 16 seeds matching the historical
  record and follows the official layout.
- Source check: "2024 NBA play-in tournament" on Wikipedia is a 173-byte redirect (revision
  1286346997), so play-in games are not available as a separate table and are not ingested.
- `npm run validate` exit 0: 391 frontend / 434 backend tests.

# Session two

## S2-1 — efficiency view closed (`a1c672b`, `e8cd484`)

- FG%-relative colouring painted every three-point cell blue; cells are now coloured by points
  per attempt against the panel's own (full strength at ±0.6), thin cells dashed. Backend test
  reconciles cell makes/attempts to the group totals; frontend test checks qualified, thin and
  colour direction.
- Full `npm run e2e`: 142 passed, 0 failed, 48 skipped by design.

## S2-2 — 2022-23 audit (`c3e241c`)

- Opt-in audit (`backend/src/scripts/audit-recorded-season.ts`): 2022-23 has 10/30 team pages
  that parse cleanly and 1119 of 1214 game IDs listed by both teams; 2023-24 for comparison has
  24/30 and 1228 of 1230. Root causes: newer `div.mw-heading` markup (now parsed, tested) and
  genuine source gaps. **Not ingested**; the contract still allows only `2023-24`. Details in
  `SOURCE_NOTES.md`.

## S2-3 — Research Workbench (`c8a1b99`)

- `GET /api/recorded/workbench`; 6 backend and 7 frontend cases (quartiles, histogram edges,
  Pearson/OLS, ranks with ties, team-filtered exclusions counted from the team page).
- Browser: bin filter, row pick, brush and point pick at 1280 and 390 px; axe found red on
  `film-2` at 4.41:1 for the picked row, fixed.

## S2-4 — Comparison Studio (`682de4d`)

- `GET /api/recorded/player-comparison`; values and z-scores equal the player rooms' exactly
  (tested). Gap board z scale grows to the largest |z| so nothing is clipped (Jokić vs Giannis
  needed ±4). 4 backend and 4 frontend cases; axe clean.

## S2-5 — Shot Studio court region (`45c495c`)

- `region=x1,y1,x2,y2` (whole feet, contract-bounded, ordered). Curry's paint box
  `-8,-6,8,8` returns 79 located attempts; the region is outlined on every view and named in
  the CSV and SVG exports.
- Drag-to-select verified in a real browser at 1280 and 390 px: draft box during the drag,
  URL and outline after release, numeric fields follow the URL, no console errors. Keyboard
  route: four numeric bounds with Apply/Clear. Axe clean on dots/density/zones with a region.
- Tests: 1 backend, 4 frontend (projection inverse, snapping, keyboard apply/clear/exports,
  four malformed regions rejected).

## S2-6 — My NBA collections (`2d22dc0`)

- Optional `tags` (1–6 per item, ≤24 chars, letters/digits/space/&'-, folded, unique). Older
  files import unchanged; imports add missing collections to existing items without renaming.
- Board: collection chips with counts, rename (refuses merging into an existing name),
  dissolve with confirmation, single-collection export. 3 store and 2 UI cases; axe clean at
  1280 and 390 px.

## S2-7 — Similarity Finder and trend departures (`899801f`, `7b56586`)

- `GET /api/recorded/similarity`: 2–9 reader-chosen rate measures, cohort z-scores, RMS
  distance. Hand-checked synthetic distances to 12 places; on real rows Jokić's nearest on
  points/rebounds/assists/FG% are Sabonis (0.59) and Antetokounmpo (0.72). Players outside the
  cohort are explained (below minimum or missing a measure; traded players have no combined
  percentages). 4 backend, 5 frontend cases; axe clean; 390 px layout checked.
- Workbench relationship view lists the five furthest above and below the fit line (residual
  and residual-SD multiples; percentages in points). Pure function tested by hand values.

## S2-8 — full browser suites at `7b56586`

- `npm run e2e`: 157 passed, 0 failed, 53 skipped by design (3.8 min), desktop and mobile
  projects, smoke and axe on every listed route including the five added this session
  (`lab-workbench`, `lab-workbench-teams`, `compare-studio`, `lab-shots-region`,
  `discover-similar`).
- `npm run validate` exit 0: 424 frontend / 452 backend tests.

# Session three — finalization

## S3-1 — Playoff Series Film Room and the bundled playoff snapshot (`50d4b90`)

- `GET /api/games/series/:seriesId`: analysis from final and period scores only. A synthetic
  series with an away overtime comeback is checked by hand (margins, running margins, halves,
  period totals, widest period, closest/largest game). All 15 real series reconcile: period
  points add to each final, wins and points per game equal the series record, one clinching game
  per decided series. Finals margins 18, 7, 7, −38, 18 match the record.
- `backend/src/features/wiki-archive/archive-snapshot.json` (86 KB): structured tables from the
  2023–24 season and 2024 playoff articles (revisions 1347383197 and 1376206465), built by
  `build-archive-snapshot.ts` with the same strict parsers; refuses an incomplete bracket. Live
  fetch falls back to it; `WIKI_ARCHIVE_MODE=bundled` never contacts Wikipedia. Responses say so.
- Browser: 1280 and 390 px, keyboard tape (Home/arrows, one tab stop); axe found "clinched" in
  red at 4.41:1 on the selected card, now chalk text with a red mark. The game page margin-flow
  label for the away team moved below the axis (same component on game pages).

## S3-2 — Statistical Story Builder (`e062351`)

- Separate store `nba-explorer.stories.v1`: 25 stories × 30 sections, 300,000 characters,
  control characters rejected, prototype keys refused, imports never overwrite (ID collisions get
  new IDs), share links ≤ 6,000 characters in the URL fragment. 5 store, 2 embed-plan and 5 UI
  tests; saved research untouched.
- Real browser at 1280 and 390 px: starter → edit → reorder (focus stays on the moved control)
  → reader → print emulation and a PDF → share link opened in a fresh browser and saved. Axe
  clean on library, editor and reader. A cold start once refused two embeds (the API's 3-slot
  source budget); embeds now retry twice before reporting the source unavailable.

## S3-3 — Specification gaps, tour and polish (`bbb7ca1`, `93499a5`)

- Global search finds playoff series and games (A10); published leaders link to player rooms on
  exact names only: 411 of 492 labels; surname-only ties stay text (C12, D13). Comparison CSV
  and gap-board SVG exports (F10). `/tour`; homepage band leads with the new rooms.
- Homepage photos slid in from the right let phones scroll sideways (413 px at 390); the section
  now clips horizontal overflow. All showcase routes measured 390 px wide afterwards.
- Team page 2023–24 panel falls back to the committed recorded snapshot.
- Test infrastructure: under heavy host load (CPU 77 %, 2 GB free, owner's browser open) correct
  tests failed only by timing. Async UI waits are now 4 s, frontend tests 15 s, backend 20 s;
  several suites pre-compile their lazy routes. No assertion was changed.

## S3-4 — production build, offline and presentation checks

- `scripts/start-presentation.ps1`: build, start, health check, reuse of its own server and the
  stop script were exercised on this machine (Windows PowerShell 5.1). The first version's
  `npm` call broke under PowerShell 5.1; it now runs `npm.cmd` through `Start-Process`.
- Production build on port 4310: 20 routes loaded and refreshed with every non-local browser
  request blocked; no API errors, no page errors, zero external requests.
- Offline simulation: a second production server loaded with a preload that fails every
  outbound fetch (the machine's network untouched). Archive, recorded, shot and story routes
  work; NBA.com player pages, `/history`, awards and draft show their unavailable state
  (blocked: `stats.nba.com`, `query.wikidata.org`).
- NBA.com Stats answered through the app's own client at this check (insights and career with
  `nba-stats` provenance), unlike earlier sessions; a bare curl without the expected headers
  times out.
- `npm audit` and `npm audit --omit=dev`: 0 vulnerabilities. No secrets in tracked files.

## S3-5 — final gates

- Format, lint (0 errors, 13 pre-existing warnings), module-case and typecheck: pass. Frontend
  448/448, backend 457/457, production build: pass.
- `npm run e2e`: 169 passed, 0 failed, 57 skipped by design (desktop-only axe), 6.6 min,
  including the new routes `series-film-room`, `series-film-room-game`, `stories` and `tour`.
- Final offline tour on the rebuilt production server: as S3-4, and the team 2023–24 panel now
  works offline from the committed snapshot.
- The NBA.com player error now names the source and says nothing is substituted.
