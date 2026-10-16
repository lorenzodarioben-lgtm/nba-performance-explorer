# Deployment runbook — NBA Performance Explorer 3.2

**This document describes a future, owner-approved release. Nothing in it has been executed.**
No merge, deploy or production setting change was made while preparing the release candidate.

## Where things stand

| Item                | State                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public site         | `https://nba-performance-explorer.onrender.com`, auto-deployed by Render from `main` (`render.yaml`, `autoDeploy: true`). It still serves the **pre-3.0 `main`** (last merge `cd557e4`). |
| Release candidate   | Branch `claude/nba-explorer-3-expansion` (see `RELEASE_READINESS.md` for the exact HEAD). `main` is an ancestor of it, so the merge has no conflicts.                                    |
| Recoverable history | `codex/nba-explorer-2-engine` (2.0 engine), `claude/nba-explorer-design` (2.0 redesign) and the 3.0 branch stay on GitHub untouched; a squash merge does not delete them.                |
| CI                  | `.github/workflows/ci.yml` runs `npm ci` and `npm run validate` on every push and pull request (Ubuntu, Node 22).                                                                        |

## 0. Publication decision for NBA.com data (owner, 3.2)

3.2 ships a 21 MB NBA.com-derived league archive (`backend/src/features/league/data`) and calls
NBA.com's CDN and Stats endpoints from the server for live games, play-by-play, lineups and
on/off. This data is used under the owner's accepted risk; no licence or redistribution
permission is held ([data integration report](../expansion5/DATA_INTEGRATION_REPORT.md)).
Before merging, decide whether a public deployment should include it. The options:

- **Publish as built.** Every NBA.com-derived page states its source.
- **Keep it local.** Do not merge 3.2 into `main`; demonstrate it from the laptop
  (`DEMO_RUNBOOK.md`).

**Images (visual-assets branch).** The site now also ships NBA.com headshots, NBA and team marks
(current and historical, identified from SportsLogos.Net) and AI-upscaled editorial photos supplied
by the owner. No reuse permission is recorded for any of them
([integration report](../visual-assets/INTEGRATION_REPORT.md#source-and-usage-status)); they are
part of the same publication decision.

**Size and memory.** The archive adds about 21 MB to the repository and to `backend/dist` (the
build copies the digest-pinned files unchanged with `copy-shot-data.ts`). The server
decompresses at most four seasons' games at a time (an LRU), and the first champions request is
warmed at start-up. The frontend bundle is unaffected: every 3.2 page is a lazy route.

## 1. Final pre-merge review (owner)

1. Read `docs/release/RELEASE_READINESS.md` and its go/no-go list.
2. Run the local demonstration (`docs/release/DEMO_RUNBOOK.md`) once on the release commit.
3. Open a pull request **from** `claude/nba-explorer-3-expansion` **into** `main`. Do not merge yet.
4. Wait for the CI check on the pull request to pass. If it fails, stop and fix on the branch.
5. Skim the diff summary: the PR is large (2.0 engine, redesign and 3.0). The feature matrix
   (`FINAL_FEATURE_MATRIX.md`) and `HANDOFF.md` describe what changed.

## 2. Render settings to confirm before merging

Render reads `render.yaml` on deploy; nothing in it changed for 3.0. Confirm in the Render
dashboard that the service still matches:

| Setting                           | Expected                                                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Build command                     | `npm ci && npm run build`                                                                                                         |
| Start command                     | `node backend/dist/server.js`                                                                                                     |
| Health check path                 | `/api/health`                                                                                                                     |
| Node                              | 22.x (`package.json` engines `>=22.12.0 <23`)                                                                                     |
| `NBA_DATA_PROVIDER`               | `nba-stats`                                                                                                                       |
| `NBA_ALLOW_FIXTURE_IN_PRODUCTION` | `false`                                                                                                                           |
| `NBA_STATS_TIMEOUT_MS`            | `10000`                                                                                                                           |
| `FRONTEND_DIST`                   | `frontend/dist`                                                                                                                   |
| `WIKI_ARCHIVE_MODE`               | _unset_ (defaults to `live`: fetch Wikipedia, fall back to the committed snapshot). Optional: `bundled` never contacts Wikipedia. |

No new secrets or paid services are required. Neither 3.0 nor 3.2 adds an environment variable
that must be set.

## 3. Merge (owner action)

- Strategy: **squash merge** the pull request into `main`, so `main` gains one concise commit.
  Suggested title: `NBA Performance Explorer 3.0`.
- Do not delete the source branch when GitHub offers to.
- Render starts a deploy automatically when `main` changes (`autoDeploy: true`). Expect the
  free instance to build for several minutes.

## 4. Health checks after the deploy

```bash
curl -s https://nba-performance-explorer.onrender.com/api/health
```

Expected: `{"status":"ok", ..., "service":"nba-performance-explorer-api"}`. A cold free instance can
take about 50 seconds to answer the first request.

## 5. Public smoke test (about 10 minutes)

Open each URL on the public host, refresh it once (deep-link fallback), and check the noted result.

| URL                                                                                    | Expect                                                                                   |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `/`                                                                                    | Homepage with the new-in-the-film-room band and search.                                  |
| `/games/bracket`                                                                       | Complete 2024 bracket, Boston champion, 16 seeds.                                        |
| `/games/series/r4-BOS-DAL`                                                             | Film room: BOS 4–1 DAL, Game 5 selected, five game cards.                                |
| `/games/nba:0042300404`                                                                | Game 4 page; leaders link to player rooms.                                               |
| `/standings/race`                                                                      | Race plays; ladder-rank view switches.                                                   |
| `/teams/nba:1610612738/season`                                                         | Boston 2023–24 season room.                                                              |
| `/lab/shots?players=201939&view=density&region=-8,-6,8,8`                              | Shot Studio with the paint region outlined.                                              |
| `/lab/workbench?view=relationship&metric=pointsPerGame&y=assistsPerGame`               | Scatter with fit line and departures.                                                    |
| `/compare/recorded?players=203999,203507`                                              | Gap board and statements.                                                                |
| `/discover/similar?player=203999&metrics=pointsPerGame,reboundsPerGame,assistsPerGame` | Ranked neighbours.                                                                       |
| `/my-nba/stories`                                                                      | Start the Boston starter; read view renders live embeds.                                 |
| `/players/201939`                                                                      | NBA.com player page: **either** live data **or** the honest "unavailable" state (see 6). |

Check the browser console for errors on at least the film room and story pages.

## 6. NBA.com provider availability

NBA.com Stats timed out from the development host in earlier 3.0 sessions and answered at the final check; cloud hosts are sometimes blocked. On Render, verify:

```bash
curl -s "https://nba-performance-explorer.onrender.com/api/players?search=curry" | head -c 300
```

- Data returned: the live player pages work on this host.
- An error or timeout: the player pages show their unavailable state; every archive-based
  feature (bracket, film room, team seasons, workbench, studio, similarity, stories, Shot
  Studio) is unaffected. `render.yaml` documents the optional rollback of the player provider
  to labelled fixtures (`NBA_DATA_PROVIDER=fixture`, `NBA_ALLOW_FIXTURE_IN_PRODUCTION=true`); that
  is an owner decision and shows a "DEMO FIXTURES" label everywhere it applies.

## 6a. NBA.com league features (3.2)

```bash
curl -s https://nba-performance-explorer.onrender.com/api/league/status | head -c 600
curl -s "https://nba-performance-explorer.onrender.com/api/league/standings?season=1997-98" | head -c 200
curl -s https://nba-performance-explorer.onrender.com/api/league/honours | head -c 200
```

- The archive routes (standings, leaders, teams, records, eras, honours, archived game days)
  answer from committed data and must work on any host.
- The status board shows whether the live NBA.com sources answered from Render. If they are
  blocked, the scoreboard, play-by-play, lineups and live standings show their unavailable
  states and everything archived keeps working.

## 7. Historical routes after deploy

- `/api/games/bracket` and `/api/games/series/r4-BOS-DAL` answer `200`. If the provenance
  warnings mention "Served from the snapshot of revision…", Wikipedia was unreachable from Render
  and the committed snapshot was used: same licensed tables, correctly labelled.
- `/api/recorded/workbench`, `/api/recorded/similarity?player=203999&metrics=pointsPerGame,reboundsPerGame`
  and `/api/shots?players=201939` answer `200` from committed data.

## 8. Rollback

The previous production commit is the current `main` head before the merge (`cd557e4` at the time
of writing; confirm on GitHub before merging).

1. **Fastest:** in the Render dashboard, open the service's deploy history and choose
   "Rollback" on the last good deploy. No Git change needed.
2. **Durable:** on GitHub, revert the squash commit on `main` (one commit, so one revert). Render
   redeploys the reverted `main` automatically.
3. The 3.0 branch and the earlier branches remain intact, so the release can be retried later.

## 9. After a successful release

- Update `README.md` to say the public site runs 3.0 (it currently says the opposite on purpose).
- Record the deploy commit, date and smoke-test result in `HANDOFF.md`.
