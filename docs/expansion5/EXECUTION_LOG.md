# NBA Performance Explorer 3.2 — execution log

| Item    | Value                                                           |
| ------- | --------------------------------------------------------------- |
| Branch  | `claude/nba-explorer-3-expansion` (no new branch)               |
| Start   | `c07807e`                                                       |
| Times   | Development host local time (UTC+11), 2026-10-16                |
| Host    | Windows 11, Node 22.19.0                                        |
| Servers | Development on 5173 and 3001; production build on 4310 and 4320 |

No AI co-author trailer was added to any commit. Never touched or used:

- protected branches;
- other worktrees;
- the shared Git stash.

## Recovery and planning

**Repository state at the start**

- The matrix after 3.1 stood at 87 verified, 33 partial, 13 blocked and 1 deferred.
- The 47 remaining IDs were grouped by the data each one needed. See
  [`ORIGINAL_SPEC_COMPLETION_REPORT.md`](ORIGINAL_SPEC_COMPLETION_REPORT.md) for the grouping.

**Owner authorisation**

- The owner authorised public NBA.com data and reopened BoxScore Lab as a cross-check.
- Every source was still put through the quality gates below
  ([`DATA_INTEGRATION_REPORT.md`](DATA_INTEGRATION_REPORT.md)).

## Data work

1. **League archive (`68cc3c8`)**
   - Built 43 seasons from NBA.com Stats, with response caches and 1.5 s spacing.
   - Applied the box-score gate: 11 seasons are team-only.
   - Pinned file digests.
   - Reconciled against Wikipedia 2023-24: all 1,219 agreed games match.
   - Cross-checked against BoxScore Lab 2022-23 to 2025-26: every game and standing matches.
     The only differences are single-unit player restatements and BoxScore Lab's home side at
     the 10 neutral-site games.
2. **Rosters and franchises (`f408029`)**
   - Rosters from `commonteamroster` for every team season.
   - The franchise archive, including defunct teams.
3. **Live sources**
   - Added the allow-listed CDN and Stats client.
   - Checked play-by-play counts against NBA.com's own box counts on real games.
4. **Shot league baseline (`519617f`)**
   - Fetched NBA.com LeagueAverages for the 2017-18 playoffs.
   - Its totals equal NBA.com's shot detail and the archive's box scores on all 164 team-game
     lines.
   - The committed CC0 events are NBA.com's own for 80 of the 82 games.
5. **Honours (`ebae403`)**
   - Parsed Wikipedia's seven award articles. Requests were spaced 6 s apart after one 429
     response was respected.
   - Resolved names to NBA.com IDs only where unique within the season.
   - Resolved three renamed players through Wikidata P3647.
   - Confirmed each winner with NBA.com `playerawards`: 261 of 262 rows.
   - Derived champions from the archived Finals games; all 43 agree with three other records.
   - First attempt: the Finals filter used the round digit in the game ID, which pre-2001 IDs
     do not have, so 17 seasons came out unsettled. Fixed by taking the playoffs' last pairing
     instead.

## Feature commits

| Commit    | Requirements                                                                 | Summary                                                                             |
| --------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `68cc3c8` | (data)                                                                       | NBA.com league archive, 43 seasons, with reconciliation                             |
| `7f79522` | E01, E04, E05, E07, E10                                                      | Season-aware standings and leaders                                                  |
| `f408029` | A02, A06, C02, C06–C11, D01, D02, D04, D06–D09, D12, D14, I02, I03, I06, I09 | Teams, franchises, record book, scoreboard, play-by-play                            |
| `55f52b0` | A05, A07, A08, A09                                                           | Live current standings, daily top performances, source status board                 |
| `06695b8` | B08, B10, B13, B15, E11, H04, K03                                            | Player record rooms, leaderboard movement, league distributions                     |
| `fcf30bd` | F09, I05, I10                                                                | League environment by season and a league-relative player index                     |
| `ddf1b32` | J02–J06                                                                      | NBA.com lineups and on/off with a two-unit comparison                               |
| `36ecae3` | (repository)                                                                 | The `coverage/` ignore rule had hidden `backend/src/features/coverage`; now tracked |
| `519617f` | G09                                                                          | Shot Studio league zone baseline; coverage page's unavailable list rewritten        |
| `ebae403` | I08                                                                          | Champions and awards, each checked against independent records                      |
| `2daf98e` | (performance)                                                                | Champions derived once per archive and warmed at start-up                           |
| `a1f978f` | (performance)                                                                | Single-game records in one shared pass; non-blocking warm-up                        |
| `65acaea` | (bug)                                                                        | Team pages: older panels rejected the new `?season=` parameter                      |
| `ecc5f3a` | (performance)                                                                | Record-book requests during warm-up wait for it                                     |

## Verification runs

### `npm run validate`

| Run | Result | Cause and outcome                                                                              |
| --- | ------ | ---------------------------------------------------------------------------------------------- |
| 1   | exit 1 | Two frontend tests unrelated to 3.2 timed out under host load. Both pass alone: 22/22 in 12 s. |
| 2   | exit 1 | The new honours route test timed out under load (see below).                                   |
| 3   | exit 0 | Clean pass; results below.                                                                     |

Run 2 exposed a real cost: every `LeagueHonours` reread all 43 seasons' games.

- Fixed in `2daf98e`.
- The same check found the record book rescanning about 12 s of player lines per category.
  Fixed in `a1f978f` and `ecc5f3a`.

Run 3 results:

- Prettier passed.
- ESLint: 0 errors, 13 react-refresh warnings (the same as before 3.2).
- The module-case check and TypeScript passed.
- Frontend: 488 of 488 tests (77 files).
- Backend: 531 of 531 tests (60 files).
- The production build passed.

### Other gates

| Check                               | Result                                                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `npm audit`, `npm audit --omit=dev` | 0 and 0 vulnerabilities                                                                                        |
| `npm run e2e`                       | 217 passed, 0 failed, 73 skipped by design (the mobile instances of the axe scans), in 12.2 minutes            |
| Production build data               | `backend/dist/features/league/data` holds all 133 files, including `honours.json`; the shot baseline is copied |
| Production route audit, port 4310   | See [Production audit](#production-audit)                                                                      |
| Offline simulation, port 4320       | See [Offline check](#offline-check)                                                                            |

**Timing after the warm-up.**

- Champions answer in 0.12 s.
- Record-book categories answer in 0.02 s, against 11.6 s before.
- The warm-up yields between seasons. The longest pause it caused was 0.68 s.

**Spot checks against real history** (all pass):

- LeBron James reached 30,000 points on 2018-01-23 and 40,000 on 2024-03-02.
- Career high: 61, against CHA on 2014-03-03.
- Games played: 55 in 2018-19, 67 of 71 in 2019-20, 71 in 2023-24.
- Playoff single-game points record in the covered seasons: Donovan Mitchell, 57, on 2020-08-17.
- Champions: Celtics over the Lakers 4–3 in 1983-84, through the Knicks over the Spurs 4–1 in
  2025-26.

## Production audit

The 3.1 route list plus 15 routes from 3.2 were each audited at 1440 × 900 and at 390 × 844
(mobile, touch), on port 4310 (bundled Wikipedia mode). The browser blocked every external
request.

**First audit (before the fixes above)**

- The record book took 21 s on its first visit. Fixed: it now waits for or reuses the warm-up.
- `?season=` produced two "invalid filters" alerts on team pages. Fixed in `65acaea`, with a
  regression test that fails without the fix.
- Two pages had no `h1` after a 1.2 s wait. This was load timing: the `h1` renders in 0.4 s
  when checked directly.
- Awards and draft returned 503. Expected in bundled mode, where Wikipedia is never contacted.

**Final audit** (after the fixes; 70 routes × 2 viewports):

- 4 findings, all expected in bundled mode: awards and draft at both widths return 503 with the
  page's unavailable state.
- No overflow, no page errors, no console errors and exactly one `h1` everywhere else.

## Offline check

The production build ran on port 4320 with a Node preload that fails every non-local `fetch`.
The browser blocked every external request, and none was attempted.

**Archive routes: all work with no alerts**

- champions (both views);
- eras with three players;
- record book;
- team rankings;
- leader movement;
- LeBron James's record room;
- the 2016-06-19 scoreboard;
- 1997-98 standings;
- the Thunder's 2007-08 team page;
- 1996-97 per-100 leaders;
- Shot Studio with the league baseline;
- `/games`;
- the coverage page.

**Live features: each shows a "Not available" alert and no substitute data**

- play-by-play of 2016 Finals Game 7 (its archived box score still shows);
- current standings;
- NBA.com lineups.

**Status board:**

- archive: archived;
- schedule and scoreboard: unavailable, with the failure time;
- current standings: not contacted.

## Servers at the end

- The presentation server (4310) was stopped with `scripts/stop-presentation.ps1`.
- The offline server (4320) and the development servers (5173, 3001) were stopped.
