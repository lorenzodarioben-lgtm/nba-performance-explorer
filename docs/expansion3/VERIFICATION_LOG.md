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
