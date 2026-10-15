# Demo runbook — NBA Performance Explorer 3.1 on a Windows laptop

A 5–8 minute presentation that runs entirely from this repository, using the production build
and the historical data committed with the app. It does not need Wikipedia or NBA.com to be
reachable.

## Prerequisites (once, while online)

1. Node.js 22 LTS (22.12 or newer within 22.x) on PATH: `node --version`.
2. In the repository folder: `npm ci` (installs dependencies; the demo script never installs
   or downloads anything).
3. Optional rehearsal: run the start command below once, so the production build exists before
   the day.

## Start

From the repository folder in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-presentation.ps1
```

The script checks Node and the installed dependencies, refuses to clash with another program on
the port, builds the app if no build exists (a minute or two), starts it in the background,
waits for a real health check and then opens **http://localhost:4310/**.

| Option         | Use                                                                                |
| -------------- | ---------------------------------------------------------------------------------- |
| `-Port 4320`   | If 4310 is taken.                                                                  |
| `-Rebuild`     | After pulling new code.                                                            |
| `-NoBrowser`   | Start without opening a browser.                                                   |
| `-LiveArchive` | Fetch the Wikipedia tables live (falls back to the committed snapshot).            |
| `-DemoPlayers` | NBA.com player pages show labelled synthetic "DEMO FIXTURES" instead of live data. |

Health check by hand: `http://localhost:4310/api/health` returns `"status":"ok"` and
`"service":"nba-performance-explorer-api"`.

## Stop

```powershell
powershell -ExecutionPolicy Bypass -File scripts\stop-presentation.ps1
```

It stops only the server the start script recorded. Logs are in
`%TEMP%\nba-explorer-presentation\`.

## The route (about 7 minutes)

The same route is built into the site at **/tour** if you prefer to click through it.

| #   | Open                                                                     | Do                                                                                | What it proves                                                                                          |
| --- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | `/`                                                                      | Scroll to "New in the film room".                                                 | One product, broadcast design, every source labelled; nothing claims to be live.                        |
| 2   | `/games/bracket`                                                         | Choose the Finals card, then **Open the film room**.                              | 82 recorded games assembled into 15 series; Boston champions only because a fourth win is recorded.     |
| 3   | `/games/series/r4-BOS-DAL`                                               | Press Home, then the right arrow along the game tape; stop on Game 4.             | Line score, running margin and period bars from published period scores only (Dallas won Game 4 by 38). |
| 4   | Series intelligence, same page                                           | Point at "Closest game 7 pts · G2, G3" and the exact table.                       | Series facts are derived and checkable; the notes say no play-by-play exists.                           |
| 5   | `/standings/race`                                                        | Press play; switch to **Ladder rank**.                                            | The 2023–24 race rebuilt date by date from verified results.                                            |
| 6   | `/lab/shots?players=201939&view=density`                                 | **Draw a court region**, drag a box around the paint.                             | 13,470 real 2018 attempts; every number follows the region (Curry: 79 attempts in −8…8 ft by −6…8 ft).  |
| 7   | `/compare/recorded?players=203999,203507`                                | Read the widest gaps, then switch to **Percentile**.                              | A fair comparison inside one stated cohort, with plain statements.                                      |
| 8   | `/lab/workbench?view=relationship&metric=pointsPerGame&y=assistsPerGame` | Pick Tyrese Haliburton from "Above the line".                                     | A relationship with r, a fit line and residuals: descriptive, not causal.                               |
| 9   | `/my-nba/stories`                                                        | Choose the Boston example, type a sentence in section 5, then **Read and print**. | Local-only research stories with live charts; print to PDF or share by link.                            |

Optional extras: `/discover/similar?player=203999&metrics=pointsPerGame,reboundsPerGame,assistsPerGame,fieldGoalPercentage`
(Sabonis 0.59 and Antetokounmpo 0.72 nearest), `/lab/formulas` (every formula with a worked
example), the search box: type `bos dal g4`. New in 3.1: `/explore/coverage` (what every dataset covers,
season by season, with counts and retrieval dates) and
`/leaders/recorded?metric=blocksPerGame&position=C` (centers as their team pages list them; ranks
stay league-wide).

Mobile: the same pages work at phone width; use the browser's device toolbar (F12, then
Ctrl+Shift+M, 390 px) to show the film room tape and the story reader.

## What works without a network

Verified with the production build while every outbound request from both the browser and the
server was made to fail:

- Works: homepage, tour, bracket, film room, game pages, playoff games, standings race, recorded
  team rankings, team season rooms, team 2023–24 roster panel (from the committed snapshot),
  Shot Studio, workbench, comparison studio, similarity finder, recorded discovery, lineups,
  recorded leaders and records (including position filters), formula lab, My NBA, stories,
  recorded player rooms (`/players/:id/archive`), and the data coverage page (its per-player
  season view needs NBA.com).
- Shows an honest "unavailable" state, with no substitute data: NBA.com player pages
  (`/players/:id`, insights, careers), the Wikidata season navigator (`/history`), awards and the
  draft.

If you are online, NBA.com player pages work too (they answered at the final check), but treat
them as optional in a presentation.

## Recovery

| Symptom                                        | Do                                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| "port 4310 is used by another program"         | Start with `-Port 4320`.                                                                                     |
| "dependencies are not installed"               | Connect to the internet and run `npm ci` once.                                                               |
| "the build failed"                             | Read `%TEMP%\nba-explorer-build.log` and `nba-explorer-build.err.log`; run `npm run build` to see the error. |
| "did not report healthy"                       | Read `%TEMP%\nba-explorer-presentation\server.err.log`.                                                      |
| A player page says unavailable                 | Expected offline. Use the recorded room instead: `/players/203999/archive`.                                  |
| A story section says the source is unavailable | Refresh once; if it persists, open the linked tool directly.                                                 |
| The page looks stale after pulling code        | Stop, then start with `-Rebuild`.                                                                            |

## How it works (one paragraph for questions)

One Node.js process (Express 5) serves both the built React 19 frontend and the JSON API, as on
Render. Historical data ships with the code: the reconciled 2023–24 team pages, a structured
snapshot of the 2024 playoff and season tables, and the 2018 shot archive. Shared Zod contracts
validate every request and response on both sides. Personal research (saved items, collections,
stories) stays in the browser's local storage, validated and size-bounded.
