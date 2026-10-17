# NBA Performance Explorer 3.3

A basketball research site with a broadcast-style "Arena & Film Room" interface: ask a precise
question of real NBA records, see the answer as an interactive chart, and see exactly which
cohort, source and formula produced it.

> **Two versions exist.** The **public site** at https://nba-performance-explorer.onrender.com
> is the **existing public release**, not evidence that 3.3 is live. Confirm its current
> Render branch/settings before approving deployment.
> `release/nba-performance-explorer-3.3` contains the **design-finalized NBA 3.3 release candidate**.
> The approved visual baseline is `8e2b38b6b3c5569c2700cd041bcb9b6d0e3818ce`.
> Publication rights and Render-host checks still require owner review; see
> [the deployment runbook](docs/release/DEPLOYMENT_RUNBOOK.md) for the planned, owner-approved
> release.

<img src="docs/release/screenshots/02-film-room.jpg" alt="The 2024 Finals film room: Boston 4, Dallas 1 on a broadcast scoreboard, above a tape of five game cards with margins and the series score after each game." width="100%" />

<table role="presentation">
  <tr>
    <td width="50%">
      <img src="docs/release/screenshots/04-shot-studio-region.jpg" alt="Shot Studio density view of Stephen Curry's 2018 playoff attempts with a dashed court region drawn around the paint and a note that every summary follows the region." width="100%" />
      <br /><sub>Shot Studio: drag a region on the court</sub>
    </td>
    <td width="50%">
      <img src="docs/release/screenshots/05-comparison-studio.jpg" alt="Comparison studio gap board: three players as distinct shapes on one standardised scale per category, widest gap first." width="100%" />
      <br /><sub>Comparison studio: one shared scale, widest gaps first</sub>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/release/screenshots/06-workbench.jpg" alt="Research workbench: points against assists for the recorded 2023-24 cohort, with a fit line, correlation and the cohort stated." width="100%" />
      <br /><sub>Research workbench: relationship with fit line</sub>
    </td>
    <td width="50%">
      <img src="docs/release/screenshots/07-story-reader.jpg" alt="A statistical story about Boston's 2023-24 season: a live Finals margin chart and series facts above the reader's own written section." width="100%" />
      <br /><sub>Statistical stories: notes between live charts</sub>
    </td>
  </tr>
</table>

All screenshots are of the real application (production build, historical data).

## What 3.3 contains

The complete release combines the capabilities below with NBA player photography and team
marks, responsive page/navigation layouts, player and global search, the historical season
navigator, the interactive liquid VS comparison band, keyboard access and reduced-motion
fallbacks. Player analytics include profiles, season statistics, careers, game logs and research
rooms; source-backed historical tools cover league seasons, teams, recorded games and research.
The scoreboard also requests NBA.com's current schedule when available. Saved research and
stories remain local to the browser. The final homepage preserves its approved headline,
Wembanyama image, transparent search and logo hover.

See [3.3 release notes](docs/release/RELEASE_NOTES_3.3.md),
[the current audit](docs/release/RELEASE_READINESS.md), and
[publication rights](docs/release/RIGHTS_REVIEW_3.3.md).
The screenshots above document earlier research tools; the
[final visual report](docs/visual-polish/FINAL_POLISH_REPORT.md) shows the approved 3.3 surface.

### Capabilities inherited from 3.0 through 3.2

- **Playoff Series Film Room** (`/games/series/:id`): any 2024 series game by game, with a
  keyboard-navigable game tape, line scores, running margin, period bars and series
  intelligence. Everything is derived from final and period scores only.
- **Statistical Story Builder** (`/my-nba/stories`): written research with live charts from six
  tools between the reader's notes. Print to PDF, validated JSON export and import, share links;
  stored only in the browser.
- **Research Workbench** (`/lab/workbench`): rank, distribute or relate any recorded player or
  team metric, with quartiles, histogram, fit line and residual departures.
- **Comparison Studio** (`/compare/recorded`) and **Similarity Finder** (`/discover/similar`):
  shared-scale gap board and plain statements; nearest seasons on 2–9 measures the reader
  chooses.
- **Shot Studio** (`/lab/shots`): dots, density, efficiency by points per attempt and source
  zones on a true court projection, with drag-to-select court regions and CSV/SVG export.
- **Seasons and teams:** standings race replay, team season intelligence, the 2024 bracket with
  published seeds, recorded leaders, records and discovery.
- **My NBA:** saved research with notes and collections, recent history (opt-in), motion
  preference, validated import/export.
- **A guided tour** at `/tour`, and global search across players, teams, playoff series and
  games, and tools.
- **New in 3.1:** the **Data Coverage Explorer** (`/explore/coverage`): every dataset's source,
  licence, revision, retrieval dates, counts and field availability by season, plus any NBA.com
  career measured season by season. Also **position filters** on recorded leaders and Workbench
  cohorts, using the positions each 2023–24 team page lists.

- **New in 3.2: the whole league since 1983–84, from NBA.com.** A reconciled 43-season archive
  powers season-aware standings and leaders (totals, per game, per 36, per 100 possessions),
  team pages for any season and franchise, a record book, dated leaderboard movement, player
  record rooms (`/players/:id/records`) and league eras (`/history/eras`). The **scoreboard**
  (`/games`) covers any date plus NBA.com's live schedule, and game pages add box scores and
  play-by-play with runs and lead changes (from 1996–97). Also: **NBA.com lineups and on/off**
  (`/lab/lineups/nba`, from 2007–08), **champions and awards** (`/history/champions`, every
  winner agreed by two sources), a **league shot baseline** in Shot Studio, and a **source
  status board** on the coverage page.

## Data

| Source                                                                            | Use                                                   | Licence                            |
| --------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------- |
| Wikipedia 2023–24 team pages (30), committed and reconciled                       | Recorded season: 1,219 agreed finals, 639 player rows | CC BY-SA 4.0                       |
| Wikipedia "2024 NBA playoffs" and "2023–24 NBA season" tables, committed snapshot | Bracket, film room, game pages, published standings   | CC BY-SA 4.0                       |
| Wikidata                                                                          | Player identity links                                 | CC0                                |
| Kaggle "NBA Playoff Shots 2018" (13,470 attempts)                                 | Shot Studio                                           | CC0                                |
| NBA.com Stats (on request, backend only)                                          | Player profiles, logs, careers                        | NBA.com terms; may be unavailable  |
| NBA.com Stats league archive, 1983–84 to 2025–26 (committed, 21 MB)               | Standings, leaders, teams, games, records, eras       | NBA.com terms; owner-accepted risk |
| NBA.com live CDN and Stats (on request, cached)                                   | Scoreboard, box scores, play-by-play, lineups         | NBA.com terms; may be unavailable  |
| Wikipedia award articles and NBA.com playerawards (committed facts)               | Award winners agreed by both                          | Facts; CC BY-SA articles linked    |

NBA.com data is used under the owner's accepted risk for this personal, non-commercial project;
no licence or redistribution permission is claimed, and publishing it is the owner's decision.
Every season was checked game by game (player lines must add up to team lines; 11 seasons fail
and are team-only) and reconciled against Wikipedia 2023–24 and BoxScore Lab 2022–23 to 2025–26,
which is used only as a cross-check and never committed
([data integration report](docs/expansion5/DATA_INTEGRATION_REPORT.md)). Fixture data appears only in tests or when explicitly enabled, and is
labelled "DEMO FIXTURES" wherever it shows.

The closeout of the original 134-requirement specification is in
[the final feature matrix](docs/release/FINAL_FEATURE_MATRIX.md): all 134 verified within
their stated scopes (3.1: 87 verified, 33 partial, 13 blocked, 1 deferred), each with evidence
and its remaining limits.

## Run it

Prerequisites: Node.js `>=22.12.0 <23`, npm, Git.

```powershell
git clone https://github.com/lorenzodarioben-lgtm/nba-performance-explorer.git
cd nba-performance-explorer
git checkout release/nba-performance-explorer-3.3
npm ci
```

**Presentation (Windows, production build, no network needed for the historical tools):**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-presentation.ps1
```

It opens http://localhost:4310/. Stop it with `scripts\stop-presentation.ps1`. The full
procedure and a 7-minute route are in [the demo runbook](docs/release/DEMO_RUNBOOK.md).

**Development:** `npm run dev` starts the frontend on http://localhost:5173 and the API on
http://localhost:3001 (Vite proxies `/api`). The player provider defaults to fixtures in
development; set `NBA_DATA_PROVIDER=nba-stats` for live NBA.com player data. Backend options
are documented in [backend/.env.example](backend/.env.example), including
`WIKI_ARCHIVE_MODE=live|bundled`.

## Quality

```powershell
npm run validate
npm run check:visual-assets
npm run e2e
```

`validate` runs Prettier, ESLint, a Windows/Linux module-case check, TypeScript, over 1,000
frontend and backend tests (Vitest, Testing Library, MSW, Supertest) and the production builds.
`e2e` runs Playwright smoke and axe accessibility checks on every listed route, desktop and
mobile, against running servers. CI runs `npm run validate` on every push. The latest recorded
results are in [the release readiness report](docs/release/RELEASE_READINESS.md).

## Architecture

```mermaid
flowchart LR
  Browser["React 19 SPA\n(Vite, TanStack Query, Motion)"] --> Api["Express 5 API\nsame origin"]
  Api --> Recorded["Committed historical data\nrecorded season, playoff snapshot, shots"]
  Api --> Wiki["Wikipedia (optional live)\nfalls back to the snapshot"]
  Api --> Nba["NBA.com Stats and CDN\nplayers, live games, lineups\non request, cached"]
  Api --> League["Committed NBA.com league archive\n43 seasons, digest-pinned"]
  Api -. "validated by" .-> Contracts["Shared Zod contracts"]
  Browser -. "validated by" .-> Contracts
  Browser --> Local["Local storage\nsaved research, stories"]
```

- One Node process serves the API and the built frontend, with SPA fallback for deep links.
- The browser never calls NBA.com or Wikipedia directly; the backend uses fixed, allow-listed
  pages and endpoints with timeouts, and never evades blocking.
- Every response is validated against shared contracts on both sides; personal data never
  leaves the browser.

Stack: TypeScript, React 19, Vite, Tailwind CSS 4, TanStack Query, React Router, Motion,
Express 5, Zod, parse5, Vitest, Testing Library, MSW, Supertest, Playwright, axe-core.

## Production

The public site is one Render web service ([render.yaml](render.yaml)): build
`npm ci && npm run build`, start `node backend/dist/server.js`, health check `/api/health`,
`NBA_DATA_PROVIDER=nba-stats`, fixtures disabled. **Merging into the linked `main` branch
can automatically deploy the release (`autoDeploy: true`); merging needs explicit owner
approval after rights and deployment checks.** NBA.com Stats is an undocumented service and
may block or slow cloud hosts; the player pages then show an unavailable state, never substitute
data. Release and rollback steps: [deployment runbook](docs/release/DEPLOYMENT_RUNBOOK.md).

## Documentation

- [Product overview](docs/release/PRODUCT_OVERVIEW.md)
- [Release readiness](docs/release/RELEASE_READINESS.md)
- [Final feature matrix](docs/release/FINAL_FEATURE_MATRIX.md)
- [Demo runbook](docs/release/DEMO_RUNBOOK.md) and [deployment runbook](docs/release/DEPLOYMENT_RUNBOOK.md)
- [3.2 completion report](docs/expansion5/ORIGINAL_SPEC_COMPLETION_REPORT.md),
  [3.2 data integration report](docs/expansion5/DATA_INTEGRATION_REPORT.md),
  [3.2 execution log](docs/expansion5/EXECUTION_LOG.md)
- [Live handoff](HANDOFF.md), [3.1 verification log](docs/expansion4/VERIFICATION_LOG.md),
  [3.1 data source audit](docs/expansion4/DATA_SOURCE_AUDIT.md), [3.0 verification log](docs/expansion3/VERIFICATION_LOG.md),
  [source notes](docs/expansion3/SOURCE_NOTES.md)
- Original engineering record: [specification](docs/expansion/SHOT_1_MASTER_SPEC.md),
  [archived ledger](docs/expansion/FEATURE_LEDGER.md), [API catalog](docs/expansion/API_CATALOG.md),
  [calculations](docs/expansion/CALCULATIONS.md), [architecture](docs/ARCHITECTURE.md),
  [decisions](docs/DECISIONS.md)

Unofficial project, not affiliated with, endorsed by or sponsored by the NBA.
