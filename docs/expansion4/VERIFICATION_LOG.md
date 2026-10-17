# NBA Performance Explorer 3.1 — verification log

Branch `claude/nba-explorer-3-expansion` (no new branch). This log records what the 3.1 overnight
completion sprint ran and the exact results, in order. Earlier history:
`docs/expansion3/VERIFICATION_LOG.md` (3.0). Times are the development host's local time
(UTC+11), 2026-10-16.

## Environment notes

- Windows 11, Node 22.19.0, npm 10.9.3. The host was heavily loaded throughout: the owner's Chrome
  was running 22 processes using about 4.7 GB. As a result, a full frontend Vitest run spends about
  6 of its roughly 10 minutes in setup.
- The host locale formats numbers with `.` as the thousands separator, so new UI code calls
  `toLocaleString('en-US')` explicitly.
- NBA.com Stats answered from this host during the sprint (nba-stats provenance confirmed).
  Wikipedia was reachable.

## P0 — verify and repair

**Route audit**

- Every route was checked on the production build (port 4310) at 1440 × 900 and at 390 × 844 (mobile, touch).
- Each route was checked for horizontal overflow, page errors, console errors, API errors, alerts, and a single `h1`.
- Result: no overflow, no page errors and no console errors on any route.

**Live archive regression (found and fixed)**

- Symptom: the awards and draft pages returned 502 in live mode.
- Cause: Wikipedia's parse API now emits Parsoid links, either absolute `https://en.wikipedia.org/wiki/Title` (unencoded) or `./Title` with `rel=mw:WikiLink`.
- Fix: `wikiLink` in `backend/src/features/wiki-archive/html-tables.ts`:
  - accepts all three forms and decodes them;
  - rejects namespaces, fragments and queries;
  - re-encodes titles to MediaWiki's legacy form so existing identities still match.
- The draft parser also skips empty rows.
- Tests: `html-tables.test.ts` (2), plus Parsoid-equivalence cases in `history-draft.test.ts` and `history-awards.test.ts`.
- Commit `f05fb89`.

**Live team pages against the snapshot**

- All 30 live 2023–24 team pages give results identical to the committed snapshot.
- For 8 teams, the roster now carries article URLs that the snapshot has as null. These are additions only.
- The snapshot was not refreshed; see `DATA_SOURCE_AUDIT.md` §6.

**Interaction audit (all passed)**

- 8 exports.
- Save, then reopen from My NBA.
- Corrupt local storage recovers.
- Invalid URL parameters show alerts without calling the API.
- Story reload.
- Shot Studio touch region drag.

**Bugs fixed (commit `8c6e5b5`)**

- _Game research with no `season` parameter_ showed an error alert. It now selects the player's latest season, and shows a status message if none loads. 2 tests.
- _Series Film Room "Save"_ lost the selected game. The saved path now carries `?game=`.
- _Story Builder cold start_: six embeds raced the server's `SourceWorkBudget` (limit 3, deliberately no queue). Embeds now share a client-side limit of 2 in flight (`stories/embed-pacing.ts`, with a test). Cold start: 6/6 embeds loaded, with at most 2 concurrent.
- _Test reliability under load_:
  - 27 page suites now import their page module before assertion timers start, so a lazy route's compile time is not counted against `findBy` timeouts.
  - The shell tests import `SearchOverlay` up front.
  - The shared MSW server now has a default handler for `/api/games/bracket`, which a shell test was requesting unmocked.
  - No assertion was changed and no timeout was raised.

**Formatting**

- `GAP_CLOSURE_PLAN.md` was committed despite a prettier warning that a pipe hid.
- Fixed in `ca601e3`. Every later check reads the exit code directly.

## P1 — gap closure

The plan is in [`GAP_CLOSURE_PLAN.md`](GAP_CLOSURE_PLAN.md).

**H11 / I11 — Data Coverage Explorer (`4d62922`)**

- New `GET /api/coverage` endpoint with a strict contract: 400 for any query parameter, 405 for other methods.
- Every count and field share is computed from the committed datasets at startup. Nothing is hand-entered.
- New `/explore/coverage` page with:
  - a season-by-dataset grid;
  - dataset cards showing source, licence, revision, retrieval range, counts, field availability, unavailable fields and tools;
  - live-source modes;
  - a per-player season-by-season field view measured from the NBA.com career rows.
- Linked from the footer, `/explore`, search and the shared "unavailable" notice. Added to the saved-path allow-list and to the e2e routes.
- Corrections made during verification:
  - A drafted note claimed that only traded players had raw totals. This was false: totals are published by 8 of 30 team pages. The note is now computed.
  - A "games behind" note was removed.
- Tests: `coverage.test.ts` (4) and `CoveragePage.test.tsx` (4).
- Browser checks at desktop and mobile widths.

**E08 / H05 — source-listed position filters (`46d69ad`)**

- Positions come from the player's own 2023–24 team page roster, matched by NBA ID or article URL.
- Families:
  - G includes G and G/F.
  - F includes F, G/F and F/C.
  - C includes C and F/C.
- Leaders (`/leaders/recorded?position=`):
  - The filter is display-only, so ranks, percentiles and the qualified population stay league-wide.
  - There is a "Listed position" column, and the CSV includes positions.
  - With a filter applied, the page also shows exclusion counts for that family.
- Workbench (`/lab/workbench?position=`, players only):
  - The position defines the cohort (for example, "Recorded centers (listed C or F/C)…").
  - Exclusions are counted inside the family, and "No roster position listed on the team page" is its own exclusion.
- Genuine data:
  - Rebounds, 20+ GP: guards 167, forwards 200, centers 77 of 363 qualified; 11 qualified players are unlisted.
  - Workbench FG%: guards 124, centers 58.
- Tests:
  - `recorded-positions.test.ts` (3): hybrid membership (Sabonis F/C appears in F and C); filtered ranks equal unfiltered ranks; the workbench cohort equals the leaders filter; 400 for `PG`, `G/F`, `X` and teams combined with a position.
  - `RecordedArchivePage.test.tsx` (1) and `WorkbenchPage.test.tsx` (1).
- Gates: format, lint (0 errors, the 13 baseline warnings) and typecheck all passed.
- Browser at 375 × 812: no horizontal overflow on either page.

**Investigated and left PARTIAL**

- B08, B10, B13, K03, C02, C06, C08, C10, C11, E04, E05, E07, E10, E11, H04, plus the game and lineup gaps.
- Each one needs data that no permitted source provides. Reasons are in the plan's "Partial and expected to stay partial" table.

**A09**

- The coverage page states how each live source is used, but it does not poll source health. A09 remains PARTIAL.

## P2 — additional historical data (`969873e`)

Full write-up: [`DATA_SOURCE_AUDIT.md`](DATA_SOURCE_AUDIT.md).

**Quality gate: passed**

- BoxScore Lab 2023–24 was compared with the archive using only the three 2023–24 CSVs (about 415 KB), downloaded to session scratch.
- Team games: 2,460 of 2,460 rows matched.
- Scores: 9 differences, exactly the 9 games the archive already quarantines.
- Standings: 30 of 30 teams matched.
- Players: for 460 single-team players, GP and per-game values matched; there was 1 FG% difference.

**Licence gate: failed**

- BoxScore Lab's CC BY 4.0 grant cannot cover NBA Stats data, whose terms (Section 9) restrict publication and comprehensive databases.
- Decision: not integrated. No file entered the repository.

## P4 — final regression

### First `npm run validate` (04:07–04:15): failed, exit 1

| Gate                                       | Result            |
| ------------------------------------------ | ----------------- |
| Format, lint, module-case check, typecheck | Pass              |
| Frontend tests                             | 456 of 457 passed |

- Failing test: `SeasonTotalsPanel.test.tsx`, "sanitizes source errors…".
- Cause: a real regression from `4d62922`, not a timing failure.
  - The shared "unavailable" notice now contains a router `<Link>` to `/explore/coverage`.
  - The test rendered the panel without a router, so the link threw.
  - In the app, the panel always renders inside the router. No other router-less test renders a failed state.
- Fix (`f06e68f`): the test now wraps the panel in `MemoryRouter`. No assertion was changed.

### Second `npm run validate` (04:16–04:22): passed, exit 0

| Gate                                    | Result                                                                |
| --------------------------------------- | --------------------------------------------------------------------- |
| Prettier, module-case check, TypeScript | Pass                                                                  |
| ESLint                                  | Pass: 0 errors, 13 pre-existing react-refresh warnings (the baseline) |
| Frontend tests                          | **457 passed** of 457 (69 files)                                      |
| Backend and contract tests              | **468 passed** of 468 (51 files)                                      |
| Production build                        | Pass                                                                  |

Compared with 3.0 (448 frontend, 457 backend):

- Frontend gained 9 tests (game research 2, coverage 4, embed pacing 1, position UI 2).
- Backend gained 11 tests: coverage 4, positions 3, link parsing 2, and the Parsoid cases in draft and awards.

### `npm run e2e` (04:22–04:28)

- Result: **172 passed, 0 failed, 58 skipped**, desktop 1440 × 900 and mobile 390 × 844.
- 3.0 had 169 passed and 57 skipped. The new coverage route added a desktop smoke test, a mobile smoke test and a desktop axe scan. Its mobile axe instance skips by design, like every axe scan.

### `npm audit` and `npm audit --omit=dev`

- 0 and 0 vulnerabilities.

### Production build, presentation scripts

- `scripts\stop-presentation.ps1` stopped the previous server.
- `scripts\start-presentation.ps1 -Rebuild -NoBrowser` rebuilt the app, passed its health check and served http://localhost:4310/ in bundled mode.

**Route audit, bundled mode**

- 55 routes, including the new coverage and position routes, at 1440 × 900 and at 390 × 844 with touch. External browser requests were blocked.
- No overflow, page errors, console errors or duplicate `h1`.
- Only findings: `/history/awards` and `/history/draft` returned 503 with the honest unavailable notice.
  - This is by design: bundled mode never contacts Wikipedia, and those two pages are live-only.
  - The demo runbook already lists them as unavailable without a network.

**Restart with `-LiveArchive`**

- `/api/history/awards` returned 200 (2.6 s) and `/api/history/draft` returned 200 (3.2 s). This confirms the `f05fb89` parsing fix on the production build.
- `/api/coverage` returned 200. It reported 5 datasets and the live-source modes `nba-stats: on-request`, `wikipedia: fallback-to-committed`, `wikidata: on-request`.

**Route audit, live mode**

- One finding: on desktop, `/players/201939/games` called `game-research?season=2025-26` (the new latest-season default), and the cold NBA.com request exceeded the 8 s timeout (504).
- The page showed the unavailable notice and no substitute data.
- An immediate retry returned 200, as did the same route on mobile in the same run. This is upstream latency, not an app defect.

### Offline simulation

- Setup: a second production server on 4320, in bundled mode, with a preload that makes every non-local `fetch` fail. The browser had every external request aborted.
- Work offline (19 routes): home, tour, bracket, Finals film room, playoff game, standings race, Shot Studio, comparison studio, workbench, stories, the Boston 2023–24 roster panel, `/leaders/recorded?position=C`, `/lab/workbench?position=G`, `/explore/coverage` and the recorded player room.
- Unavailable offline, as documented, with no substitute data: NBA.com player pages, the coverage page's per-player view (it needs NBA.com), `/history` (Wikidata) and awards.
- The browser made no external requests. The server blocked 3 outbound attempts.
- The offline server was stopped afterwards.
