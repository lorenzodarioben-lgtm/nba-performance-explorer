# Archived original Shot 1 specification

The owner closed Shot 1 feature expansion on 2026-10-14. This original specification is preserved for auditing the 134 requirements; current HANDOFF.md and the Claude design handoff govern subsequent work. Do not resume feature expansion from this archive.

# NBA PERFORMANCE EXPLORER 2.0

## SHOT 1 — THE ENGINE: AUTONOMOUS FUNCTIONAL EXPANSION

### Codex master execution brief | Read completely before making edits

> **Instruction to the coding agent:** This file is an executable engineering mandate, not a request for a planning-only response. Work in the repository and implement as much of the specified platform as you can _correctly_, using the autonomy and execution time available. Do not stop after producing an outline, TODO list, scaffolding, or a few example pages. Continue through real, testable milestones. Leave a truthful, restartable handoff if interrupted.
>
> **Absolute boundaries:** $0 mandatory data/API/hosting costs; retain the existing NBA.com Stats provider; do not change the existing site's visual design; new UI may be intentionally plain; all displayed NBA statistics must have real provenance; no unauthorized production deployments, destructive Git history changes, blocking evasion, or fake demonstrations.
>
> **Division of labor:** You are the **implementation engineer**. A later session using Claude will develop the visual direction under human supervision. Your responsibility now is robust data, architecture, features, integrations, tests, working plain UI, documentation, and a clean design handoff.

---

# 0. EXECUTION CONTRACT — READ FIRST

Treat the following as priority-ordered instructions whenever two objectives conflict:

1. **Protect the existing application, repository history, credentials, and production service.** Work on a feature branch. Never merge into `main`, force-push, rewrite existing Git history, alter deployed credentials, or deploy production without explicit authorization.
2. **Preserve the original visual design pixel-for-pixel to the maximum degree possible.** Do not redesign the current home, player profile, compare page, masthead, footer, typography, global CSS, imagery, colors, spacing, layouts, or animation. Structural modifications to the route table and nonvisual plumbing are permitted. Old routes must continue behaving the same.
3. **Use only free, legally and technically usable data paths.** Unofficial sources are allowed candidates, but must be evaluated for their applicable terms, limits, attribution, provenance, and reliability. No paid API, paid database, subscription, payment-required account, trial-to-paid dependency, proxies/IP rotation, captcha bypass, credential theft, or anti-bot evasion.
4. **Never fabricate NBA facts.** No pretending a sample scoreboard is live; no bogus shot coordinates; no hard-coded player outcomes; no synthetic "real" lineup ratings, predictions, leaderboards, or historical records. Deterministic fixtures are allowed **only for tests, explicit local/demo mode, and isolated UI verification**, prominently separated from production data.
5. **Prefer fully functional vertical slices over hollow breadth.** A feature counts as complete only when its contract, real/verified source or honest unavailable state, computation, page interactions, tests, and error/empty/loading behavior work.
6. **Run validation frequently and repair regressions.** Do not knowingly leave previously passing tests broken while building unrelated work. Never claim a test passed unless the command actually ran and passed.
7. **Record everything important in a continuously maintained root `HANDOFF.md`** and supplementary execution files. Another agent must be able to continue from the exact verified state without guessing.
8. **Use your available execution window aggressively but safely.** Operate independently on normal coding decisions. If a tool, API, host, or time limit prevents further work, commit only coherent checkpoints and document the precise blockers and next action. Do not rush unfinished work into a false DONE state.

## Definition of this three-shot program

- **SHOT 1, THIS RUN — ENGINE:** Expand the product functionality and real data layer. Plain HTML/Tailwind/basic charts on new pages are ideal. Preserve every original page's visual identity.
- **SHOT 2, LATER — EXPERIENCE:** A separate design-oriented Claude workflow produces approved mockups/design artifacts; Codex implements them. Do **not** undertake its redesign work now.
- **SHOT 3, LATER — FINAL HARDENING:** Dedicated adversarial testing, visual QA, performance, security review, production readiness and release audit. Nevertheless, SHOT 1 must already be functional, tested and responsible; do not defer correctness until SHOT 3.

**What success looks like:** A visitor can open a new `/explore` index and reach substantial new, genuinely usable sections for teams, schedules/games, standings/leaders, statistics, player analysis, comparisons, research, and more. The old home/profile/compare screens remain visually unchanged. Advanced modules appear only when their data is honestly supported. Live integrations are validated independently of deterministic CI tests. The implementation ledger tells the truth.

---

# 1. ACTUAL REPOSITORY BASELINE — RECONFIRM IN THE WORKTREE

Repository: `https://github.com/lorenzodarioben-lgtm/nba-performance-explorer`

At the time this brief was prepared, the public `main` branch showed:

- Monorepo using **npm workspaces**: `frontend`, `backend`, `packages/contracts`.
- **Node.js 22**, TypeScript, React 19, Vite, React Router, Tailwind CSS, TanStack Query, Recharts, Express 5, Zod, Vitest, Testing Library, MSW, Supertest.
- Existing React route entry: `frontend/src/App.tsx`. Routes: `/players/:playerId`, `/compare`, and a catch-all showing `FoundationPage` (including the homepage).
- Existing front-end files to protect include `frontend/src/AppHeader.tsx`, `AppFooter.tsx`, `styles.css`, `features/foundation/*`, `features/players/*` and `features/player-comparison/*`.
- Existing Express application: `backend/src/app.ts`, currently mounting `/api/health` and `/api/players`.
- Existing provider interface: `backend/src/features/players/player-provider.ts`, with methods for player search, profile, seasons, season stats, career trends, and game logs.
- Existing live provider: `backend/src/features/players/nba-stats/nba-stats-player-provider.ts`, calling NBA.com Stats endpoints `commonallplayers`, `commonplayerinfo`, `playercareerstats`, `playergamelog` (the same career endpoint serves multiple public functions). **Do not assume five distinct upstream endpoints:** the existing server calls **four named NBA.com Stats endpoints**; there are **five functional data families** if counting the derived season/trend operations separately. Inspect the code as the source of truth.
- Existing `NbaStatsHttpClient`, strict tabular response validator, provider-specific mappers, bounded process-local LRU cache, sanitized errors, optional diagnostics, and deterministic fixture provider.
- Existing public Zod schemas in `packages/contracts/src/`, including player summary/profile, player season statistics, game logs and career trends.
- Existing public player season stats fields: games played, MPG, PPG, RPG, APG, SPG, BPG, turnovers per game, and FG/3PT/FT percentages. Existing game-log contract: ID, date, team, opponent, home/away, win/loss, minutes, points, rebounds, assists. **These do not contain raw shot attempts, possessions, game-by-game steals/blocks/turnovers, or shot coordinates.** Do not calculate unsupported metrics as if they were supported.
- Production is described in `render.yaml` as a **single free Render web service**. Production config uses `NBA_DATA_PROVIDER=nba-stats`, `NBA_ALLOW_FIXTURE_IN_PRODUCTION=false`, and `FRONTEND_DIST=frontend/dist`.
- Root `npm run validate` does format check, lint, typecheck, tests and production builds. Root `npm run dev` runs the frontend/backend development stack.
- Existing `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` and `docs/PROJECT_STATE.md`. Some have early-project titles/status text; compare docs with present code instead of treating dated state reports as newer than Git HEAD.
- Existing upstream caveat: NBA.com has previously returned a structurally valid yet empty career result for one star while another player succeeded. This is documented in `docs/PROJECT_STATE.md` and task history. **Missing data is a real operating condition**, not justification for fabricating it.
- Existing README screenshots under `docs/assets/` may provide a baseline for regression checking.

**These observations are hints, not permission to skip inspection.** Start by checking the actual checked-out HEAD, modified files, package scripts, docs, and route/provider implementations. If the repository has changed, follow the live worktree, record differences, and adapt without destroying recent work.

### Inspect at minimum

`README.md`; `package.json`; workspace package files; `render.yaml`; `.github/workflows/`; `frontend/src/App.tsx`; `frontend/src/AppHeader.tsx`; `frontend/src/AppRoot.tsx`; `frontend/src/styles.css`; existing page components/tests; `backend/src/app.ts`; backend feature providers and routers; `packages/contracts/src/`; `docs/PROJECT_SPEC.md`; `docs/ARCHITECTURE.md`; `docs/DECISIONS.md`; `docs/PROJECT_STATE.md`; and any existing HANDOFF/agent instructions.

### Initial commands (adjust to environment)

```bash
git status --short --branch
git branch --show-current
git rev-parse HEAD
git remote -v
node --version
npm --version
npm ci
npm run validate
```

If install or baseline validation cannot run (dependency network restrictions, incorrect Node, no sandbox resources), record the precise error and continue with safe, testable work if possible. **Do not label the baseline passing** unless it really passes. If the tree has preexisting modifications, preserve them, identify their ownership, and do not overwrite/stash/reset them automatically. Seek a safe separate worktree or isolated branch where possible; otherwise document the blocker and stop potentially destructive edits.

---

# 2. GIT / AUTONOMY / CHECKPOINT RULES

## Branch model

- Create or reuse a clearly named working branch, e.g. `feature/nba-explorer-2-engine` (choose a unique suffix if it already exists and is unrelated).
- **No commits to `main`. No merge or production deployment. No force pushes.** If the environment supports authenticated remote feature-branch pushes and such pushing is already authorized for your session, they may be used for backup, but never push `main` or trigger a production deployment. If unsure, only commit locally and record the state.
- Make small coherent commits per tested vertical slice, using specific commit messages. Do not manufacture a contribution history, backdate commits, or create empty/no-op commits.
- Do not change license, remove branding/attribution, delete legacy tests, silence failing tests, or rewrite accepted ADR history.
- Do not install or enable expensive services, make irreversible external changes, or modify external accounts without approval.

## Checkpoint cadence

After each meaningful implementation slice:

1. Update the feature ledger and `HANDOFF.md`.
2. Run relevant focused tests and typecheck; run the full validation gate at milestone boundaries.
3. Review diff, dependency additions and changed files; verify no existing visual surface was inadvertently modified.
4. Commit only when coherent and non-destructive. Prefer commits with passing affected tests; if unable to fully validate, label the checkpoint honestly in handoff.
5. Continue to the next highest-value runnable task. **Do not stop for user approval** on ordinary architecture or coding decisions. Ask only for truly necessary permission or an irreversible choice.

## If unattended execution stops

Before end-of-session, update root `HANDOFF.md` with: branch, exact HEAD, working-tree changes, commits, verification commands/results, source tests, what works, what is blocked, files changed, incomplete work, and one next action. Include a concise `CONTINUE FROM HERE` instruction. If tool/time limits prevent a final write, prioritize saving a checkpoint over starting a risky new subsystem.

---

# 3. STRICT DESIGN FREEZE — SHOT 2 BELONGS TO CLAUDE

This is a **functional-overhaul phase**, not a UI redesign phase.

## Protected existing surfaces

- Original homepage/landing: layout, full-bleed hero, image choices, typography, links, decoration, color tokens, transitions.
- Existing player profile presentation, season selection, career charts, game log styling and behavior.
- Existing two-player comparison visuals, their statistics/scaling, responsive behavior and shareable URL semantics.
- Existing fixed masthead, mobile menu, footer, logo, metadata, and global CSS styling.
- Original CSS variables, Tailwind utilities where they affect legacy UI, existing asset files and screenshot baselines.

**Do not make aesthetically motivated modifications to protected files.** Changing `App.tsx` to register routes, `AppRoot.tsx` for nonvisual data context if unavoidable, and backend/shared contracts is permitted; preserve current page render trees and styling. Do not globally restyle tags (`body`, `h1`, `button`, `table`) because this can invisibly damage legacy screens.

## How users access the new features during SHOT 1

- Create a **new, plain `/explore` route** as the temporary functional portal. Give it understandable links to all implemented sections and clearly marked unavailable/partial sections; avoid dead links and dummy controls.
- New pages can have their **own minimally styled, accessible local navigation**, with a light structural layout if necessary. The original header/footer stay unchanged, even if their nav isn't yet optimized for the new pages.
- The `/explore` portal should be directly addressable and documented prominently in the engineering README or feature ledger. **Do not insert a new nav bar or redesign the current masthead just to expose it**; that integration is for the supervised design pass.
- New pages: plain cards, HTML tables, select/input/checkbox controls, modest Recharts graphs, minimal CSS modules or narrowly scoped Tailwind classes. Consistent and readable, not glamorous. Use no large design/animation/image dependency solely for this phase.
- When practical capture before/after screenshots of `/`, `/players/<existing-fixture-id>`, and `/compare` at identical viewport/content/fixture conditions using existing test tooling or a lightweight browser test. Diff or manually inspect them. If browser screenshot tooling isn't available, use strict diff review and existing component tests; **do not falsely claim pixel testing**.
- Never modify snapshot baselines simply to make a regression disappear. Any unavoidable protected-file edit must be extremely small, logged, and proven nonvisual.

## Visual handoff

Create `docs/expansion/DESIGN_HANDOFF_FOR_CLAUDE.md` with page inventory, routes, data states, interaction flows, features, limitations, screenshots/evidence paths, the unchanged original visual baseline, and which visual decisions are intentionally left open. **Do not write an elaborate visual design system yourself.** Claude and the human owner will decide that later.

---

# 4. THE $0 DATA STRATEGY — NO PAYWALLS, NO INVENTED COVERAGE

## 4.1 Source priorities

Investigate and evaluate these **candidates**. A candidate is not considered working until actually validated for field coverage, access, data freshness, data terms and hosting suitability.

| Priority | Candidate                                                                    | Purpose                                                                                              | Initial risk                                                                |
| -------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| P0       | **Existing NBA.com Stats integration** (`stats.nba.com`)                     | Preserve player search/profiles/careers/game logs; investigate additional league/team/shot endpoints | Unofficial, rate-limiting, empty results, cloud-IP blocking, schema changes |
| P0       | **NBA CDN Live endpoints** (`cdn.nba.com`)                                   | Scoreboards, game box scores, play-by-play                                                           | Availability/field shapes may change                                        |
| P0       | **ESPN public JSON feed** (`site.api.espn.com` and related public endpoints) | Schedules, scores, teams, rosters, event summaries, game details                                     | Unofficial endpoints, changing schemas/terms                                |
| P1       | **sportsdataverse / hoopR and sportsdataverse-data**                         | Historical NBA games, events and structured offline datasets where supplied                          | Coverage/version/update and redistribution checks                           |
| P1       | **llimllib/nba_data**                                                        | Season-partitioned NBA historical statistics and game datasets                                       | Source lineage, license and completeness checks                             |
| P1       | **wyattowalsh/nbadb**                                                        | Long-run historical datasets and extraction conventions                                              | Dataset size, field availability, terms/license                             |
| Optional | Other genuinely free/open sources                                            | Fill **specific proven gaps**                                                                        | Must pass same rights/quality tests                                         |

Helpful research starting URLs:

- `https://github.com/swar/nba_api`
- `https://github.com/sportsdataverse/hoopR`
- `https://github.com/sportsdataverse/sportsdataverse-data`
- `https://github.com/llimllib/nba_data`
- `https://github.com/wyattowalsh/nbadb`
- `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard`

Check current licenses/terms and endpoint behavior yourself; do not rely on this document for permission or guaranteed 2026 coverage. Unofficial does not mean unrestricted. **Publicly reachable JSON is not automatically permission to republish wholesale.** Comply with source policies, attribution, reasonable usage limits, and applicable data/imagery rights.

## 4.2 Known NBA.com Stats endpoint candidates to investigate

`leaguestandingsv3`, `leaguedashplayerstats`, `leaguedashteamstats`, `commonteamroster`, `commonteaminfo`, `teamdashboardbygeneralsplits`, `leagueleaders`, `shotchartdetail`, `boxscoretraditionalv3`, `playbyplayv3`, `leaguedashptstats`, `leaguedashplayerclutch`, and other legitimately available documented community endpoints.

**Do not blindly call them all.** Identify currently valid parameter sets from up-to-date documentation or known examples, test a small representative request, and implement only those that return credible structured results. Pay attention to changes between older and V3 response formats. Reuse existing NBA.com mapper/validator patterns, but create distinct validators for divergent envelopes.

## 4.3 Data-source investigation sequence

For each source and endpoint you want to use:

1. Record exact intended feature and required fields.
2. Read currently available docs, license/terms, and known limitations. Capture retrieval date.
3. Make **a small, bounded number** of respectful connectivity requests with realistic parameters and timeouts; do not flood or bulk scrape.
4. Verify status, content type, shape, row count, required field existence, ID semantics, date/season semantics, representative values, sample correctness and missingness.
5. Test more than one representative case: active superstar, player with missing upstream career rows, recently drafted player, traded player, historical player; or current/old game where applicable.
6. Compare overlapping stats from another free source when legally available; explain legitimate rounding/discrepancies.
7. Record whether the exact **production hosting environment** can reach the source. Local success does not guarantee Render success; if deployment-side testing is impossible, mark it unverified, not working.
8. Document rate-limit behavior, cache recommendation, attribution/usage limitations and nonsecret reproducible smoke-test commands.
9. Mark status: `VERIFIED_AVAILABLE`, `CONDITIONAL`, `UNRELIABLE`, `BLOCKED`, `NOT_TESTED`, or `REJECTED`. Never call an endpoint verified based only on README examples.
10. Only then implement the provider and use it on relevant routes.

Bound live probes by time, request count and concurrency; cache successes; avoid repeated requests against a failing host. Use no CAPTCHA bypass, proxy services, rotating IPs, unauthorized cookies, spoofed credentials, or evasive techniques. Do not store sensitive/raw upstream traffic in public logs.

### Mandatory output: `docs/expansion/FREE_DATA_SOURCE_AUDIT.md`

Include: endpoint/source, URL pattern (redact secrets if any), purpose, required fields, date checked, tested environment, evidence/command, HTTP result, latency range, sample row/coverage counts **without publishing inappropriate raw personal/secret data**, schema notes, update frequency, terms/attribution summary, rate limitations, caching plan, data integrity caveats, current status, and implementation decision.

### Mandatory output: `docs/expansion/FEATURE_DATA_MATRIX.md`

Per feature define: `feature_id`, endpoint/source, core field requirements, date coverage, league/season constraints, verified availability, local/host availability, freshness requirement, attribution, fallback/degradation behavior, owner route, tests, and last verified date.

## 4.4 Multi-provider architecture

- Retain the existing `PlayerProvider` functionality intact; extend through **separate domain-specific capability interfaces** such as `TeamDataProvider`, `GameDataProvider`, `StandingsProvider`, `LeaderboardsProvider`, `ShotDataProvider`, `HistoryDataProvider` or a suitable stable composition. Avoid a god interface with 40 unrelated methods.
- A unified service layer selects appropriate provider(s) **per capability**, never by hoping two providers share identifiers or metrics definitions.
- Build explicit source-ID mappings for player/team/game identities. Prefix or namespace external IDs (`nba:`, `espn:`) as appropriate; expose stable canonical IDs and source mapping records. Never simply cast an ESPN player ID to an NBA.com player ID.
- Define canonical representations for seasons (`YYYY-YY`), calendar dates/time zones, team identity across relocation/name changes, regular season versus playoffs, game statuses and stat units.
- Add normalized source metadata: `source`, `retrievedAt`, `observedAt` or `asOf`, `isLive`, `season`, coverage and any warnings. Handle provenance cleanly in contracts rather than copy/pasting text in JSX.
- Providers return typed domain models or explicit errors; raw upstream objects must **never** reach React pages.
- Zod must validate boundary inputs/outputs, with meaningful errors and empty states for unsupported or unavailable data.
- Preserve **no silent fixture fallback** in production. If a second real provider is used when the first fails, it must be documented, attributable, semantically compatible and surfaced honestly. If not compatible, show unavailable state.
- Do not bundle gigantic historical databases into the Vite client. Server-side querying or small static preaggregations only.

## 4.5 Caching with a truly free footprint

- Preserve the existing process-local LRU initially. Extend TTLs by capability. Differentiate live scores, finished game results, leaderboards, active player statistics, retired historical records and empty responses.
- Prefer **free static snapshots** for immutable/historical datasets when source rights permit: compressed, versioned, small server-friendly files with provenance manifests.
- If persistent storage is needed, select a genuinely free option only after evaluating hard limits, sleep behavior, quotas, egress and migration path. **No required billing account and no assumption that a third party's free tier is guaranteed forever.** Prefer SQLite or local artifacts for reproducible development; recognize free Render ephemeral filesystem means it cannot be used as durable production storage.
- Do not make the app depend on GitHub Actions schedules or free hosted cron working perfectly. If scheduled sync is introduced, design around skipped/delayed runs and include provenance/freshness metadata. Verify any bulk data redistribution is permitted.
- Enforce request budgets, timeout, retry/backoff policy, concurrency caps, bounded data size and caching. No retry storms or uncontrolled background crawling.
- Distinguish stale historical information from live-current information. Never display yesterday's scoreboard as live without labeling it.

---

# 5. ARCHITECTURE BLUEPRINT: SCALABLE BUT NOT OVERENGINEERED

## 5.1 Preserve the repository's conventions

Keep npm workspaces, TypeScript, React Router, TanStack Query, Recharts, Express, Zod and Vitest unless a new requirement conclusively justifies an alternative. No Redux, event-bus framework, microservices, Kubernetes or paid SaaS. Do not refactor old code simply for personal style.

Suggested **feature-based** location pattern (adapt to existing conventions):

```text
frontend/src/features/
  explorer/                 # NEW: minimal /explore portal
  teams/                    # NEW: directory, team profile, roster, splits
  games/                    # NEW: scoreboard, schedule, game details
  standings/                # NEW: conferences, records, trend tables
  leaderboards/             # NEW: player and team rankings
  player-insights/          # NEW: extended player analytics, milestones
  comparison-lab/           # NEW: 2–4 players, eras, normalized comparisons
  shot-lab/                 # NEW: court data exploration
  analytics-lab/            # NEW: rankings builder, charts, distributions
  history/                  # NEW: season browser, historical records
  lineups/                  # NEW: lineup/on-off data where supported
  discover/                 # NEW: facts, similarity, record trackers
  my-nba/                   # NEW: local favorites, saved research
  ...existing folders...    # DO NOT visually redesign them
backend/src/features/
  teams/ games/ standings/ leaderboards/ shots/
  analytics/ history/ lineups/ discovery/
  data-sources/             # provider adapters, source IDs, provenance
  ...existing players/...   # preserve original provider and routing
packages/contracts/src/
  ...existing contracts...
  team*.ts game*.ts standings*.ts leaderboard*.ts
  shots*.ts analytics*.ts history*.ts lineup*.ts
  data-provenance.ts
backend/src/scripts/
  probe-free-sources.*      # bounded, opt-in live probes (NOT unit tests)
  import-historical-data.*  # validated, reproducible import if needed
docs/expansion/
  FREE_DATA_SOURCE_AUDIT.md
  FEATURE_DATA_MATRIX.md
  FEATURE_LEDGER.md
  API_CATALOG.md
  CALCULATIONS.md
  DESIGN_HANDOFF_FOR_CLAUDE.md
  VERIFICATION_LOG.md
  RELEASE_NOTES_ENGINE.md
HANDOFF.md
```

This is illustrative; follow maintainable existing naming conventions rather than mechanically creating empty folders. **Do not create blank modules, empty routes, or features that only return `[]` as a pretense of completion.**

## 5.2 Domain and public API principles

- Use distinct schemas for `Team`, `RosterEntry`, `GameSummary`, `GameDetail`, `BoxScore`, `GameEvent`, `StandingsRow`, `LeaderboardRow`, `ShotAttempt`, `ShotZone`, `PlayerSplit`, `StatSeries`, `AnalyticsQuery`, `DatasetCoverage`, `DataProvenance`, and clearly labeled calculated metrics where they are implemented.
- Make common interfaces composable; avoid moving old Zod fields just to share abstractions. Strict validation should protect both client and server.
- Add query-parameter validation for date/season ranges, sorting fields, per-page limits, search, filters and player lists. Use predictable 400/404/502/503 error families, with sanitized information.
- Pagination and result limits must be bounded. Avoid unbounded all-player or all-game JSON payloads.
- Cross-provider data needs strong ID mapping and precision rules; season splits for traded players must not be double counted.
- Request handlers must not contact an upstream repeatedly when rendering derived views. Prefer cached services and batch-friendly reads.
- Clear distinction between _recorded facts_, _derived values_, _illustrative examples_ and _modeled estimates_. Do not call a ranking objective or official when it is a custom formula.
- Create shareable URL states for all major filters. Parse carefully on refresh, direct load, browser back/forward and invalid query strings.
- Produce canonical query hooks on the frontend with stable query keys, stale times matching source freshness, cancellation where relevant, and sensible refetch behavior.
- Error states should explain if the source is unavailable, the historical period lacks coverage, the player has no recorded data, or the request is invalid. Avoid implying the player scored zero when the field is missing.

## 5.3 API catalog proposal — implement only real capabilities

Route suggestions (names may be adjusted to existing code conventions, then document exact final route names):

```text
GET /api/health
GET /api/data-sources/status                    # non-sensitive status/provenance
GET /api/teams
GET /api/teams/:teamId
GET /api/teams/:teamId/roster?season=
GET /api/teams/:teamId/stats?season=
GET /api/teams/:teamId/schedule?season=
GET /api/games?date=&season=&team=&status=
GET /api/games/:gameId
GET /api/games/:gameId/boxscore
GET /api/games/:gameId/play-by-play
GET /api/standings?season=&conference=
GET /api/leaderboards/players?season=&metric=&mode=&minGames=&page=
GET /api/leaderboards/teams?season=&metric=&mode=&page=
GET /api/players/:id/insights?season=&lastGames=
GET /api/players/:id/splits?season=&split=
GET /api/players/:id/milestones
GET /api/players/:id/shots?season=&team=&opponent=&range=
GET /api/analytics/compare?players=&seasons=&metrics=
GET /api/analytics/distribution?season=&metric=&filters=
GET /api/analytics/similar?playerId=&season=&criteria=
GET /api/history/seasons
GET /api/history/seasons/:season
GET /api/history/records?metric=&scope=&season=
GET /api/lineups?teamId=&season=&minPossessions=
GET /api/discover/insights?season=&scope=
```

Do not implement a giant generic query endpoint that enables arbitrary expensive scans or leaking raw provider responses. No endpoint should claim to support a metric without the underlying data. Provide structured capability reporting for gated modules rather than a meaningless 200/empty-array response.

## 5.4 Canonical metrics and mathematical integrity

Implement a `stats-core` module with typed, tested, appropriately denominated calculations. Where required source inputs do not exist, **report unsupported**, or extend a free data feed rather than estimating from inappropriate values.

Examples:

- **Rolling averages**: window over games sorted chronologically, with sample count and handling for fewer than N games.
- **Per-36**: raw totals per minutes played, requiring actual minutes; avoid divide-by-zero, small-sample false precision.
- **FG%** = field goals made / attempted; **3P%** = threes made / attempted; **FT%** = free throws made / attempted (not simply average of game percentages).
- **eFG%** = `(FGM + 0.5 * 3PM) / FGA`.
- **TS%** = `PTS / [2 * (FGA + 0.44 * FTA)]` (label as standard estimate and denominator convention).
- **AST/TO** = assists / turnovers with zero-turnover handling.
- **Usage, on/off, net/offensive/defensive ratings, possessions, pace, per-100 and lineup metrics**: require explicit sufficient inputs and documented formulas. Do not invent possession data from season PPG/RPG/APG. Distinguish official sourced ratings from calculated estimates.
- **Percentile ranks**: same population/season/metric/qualification; state sample size and eligibility thresholds. Do not call raw composite bar-chart normalized values "percentile".
- **Multi-player cross-era normalization**: define the exact league baseline, pace adjustment or z-score; display raw numbers alongside normalized comparison and note era limitations.
- **Comparisons of player-season stats**: keep regular season vs playoffs separate; handle `TOT` rows and traded-player aggregates; account for different games played and missing attempts.
- **Historical records**: check season scope, playoff vs regular, franchise relocation, tied records, rule changes, data coverage, and legitimate league qualification minimums.
- **Similarity score**: explicit metric set, scaling, weights, missingness, minimum coverage and cohort; don't market it as "AI" just because it's a distance calculation.
- **Rank-builder formula**: deterministic, user-visible, weight range validation, stat directions (e.g. turnovers can be negative), qualifying criteria, and no misleading absolute "best player" declaration.
- **Shot maps**: only geolocate observed shot data; verify court orientation, feet vs units, shot coordinate system, attempt types, duplicates, zone boundaries, and missing coordinates. No manually generated real-player shot attempts.

Create `docs/expansion/CALCULATIONS.md` with formulas, assumptions, data dependencies, sample thresholds, precision rules, and references. Add small property-based or edge-case tests where useful.

---

# 6. MASTER FEATURE INVENTORY — BUILD REAL VERTICAL SLICES

**All entries below are desired product capabilities, not claims that free sources definitely support them.** Investigate data dependencies before implementation. Every feature gets an ID in the ledger, one of `DONE_VERIFIED`, `DONE_FIXTURE_ONLY`, `PARTIAL`, `DATA_BLOCKED`, `EXTERNAL_ACCESS_BLOCKED`, `NOT_STARTED`, or `DEFERRED_BY_PRIORITY`, and evidence. `DONE_VERIFIED` means the behavior works with genuine appropriately sourced data in a tested environment, not merely that a component renders.

## Module A — NBA Command Center (`/explore`, `/games` or `/dashboard`)

**Purpose:** A useful daily entry point into the league rather than a static portal. Do not replace the existing homepage; build the new experience under fresh routes until Shot 2.

Features:

- **A01: Explorer hub** — plain, accessible index of implemented modules, nonbroken links, real status labels and navigation.
- **A02: Today/date-selected game list** — date selector, teams, game time in user locale with source timezone safety, pre/live/final states, scores only when recorded.
- **A03: Yesterday/tomorrow navigation** — stable date handling across time zones and daylight saving.
- **A04: Team-filtered scoreboard** — filter by team and date without recomputing identifiers incorrectly.
- **A05: Upcoming matchup detail links** — actual game IDs and working game-detail routes.
- **A06: Recently completed games** — finished results distinct from in-progress data.
- **A07: Featured statistical performers** — only if verified per-game player stats and appropriate update coverage exist; no arbitrary "player of the night" pretending to be an official award.
- **A08: Current league snapshot** — leading teams/players if rankings are available with explicit season and as-of date.
- **A09: Live/data freshness indicator** — distinguish current, cached, stale and unavailable conditions accurately.
- **A10: Search/navigation across sections** — a plain global explore-page search for player/team/game pages where feasible; avoid touching legacy masthead.

**Minimum accepted vertical slice:** A02–A06 with actual games for a verified date, A09 source context, and working route links. If live feed cannot be reached in host, support historical recorded dates and an honest offline/unavailable state. Do not delay all other work for dynamic "live" branding.

## Module B — Player Profile Expansion (`/players/:playerId/insights`)

**Purpose:** Deep player analysis while the existing `/players/:playerId` screen stays untouched.

Features:

- **B01: Extended stats table** — full player season stats where verified fields exist, including made/attempted shooting data when available.
- **B02: Rolling form** — last 5/10/20 games with accurate sample labels, trends, and game selector.
- **B03: Game-by-game expanded ledger** — filters/sort by opponent, date, results, and available metrics.
- **B04: Home/away splits** — true input cohort calculation, min sample, percentages weighted by attempts.
- **B05: Win/loss splits** — clearly limited to observed games with records.
- **B06: Opponent splits** — per-opponent filter and computed averages.
- **B07: Early/late season and date-range splits** — stable selected date range and refreshable URL.
- **B08: Season highs, lows and personal records** — differentiate available game data vs incomplete coverage.
- **B09: Career milestone tracker** — totals only if verified, never estimated simply by multiplying rounded per-game numbers; when incomplete, show coverage warnings.
- **B10: Career timeline and team history** — correctly handle trades, franchise changes and gaps.
- **B11: Playoff/regular season modes** — if complete data exists; never mix without labeling.
- **B12: Age/experience curves** — use verified dates of birth and observed seasons when available; avoid assuming age from draft year.
- **B13: Player DNA/percentile chart** — real population distribution, qualified cohorts, explicit categories and formulas.
- **B14: Similar seasons / peers** — transparent metric-distance method, comparability and historical support.
- **B15: Injury/availability** — availability statistics inferred from reported games/schedules _only if complete enough_; do not infer a medical injury diagnosis from absence.

**Minimum accepted slice:** rolling form; home/away and W/L splits; season highs; additional tabular data; tests. Use separate new pages/components, not a redesign of current player screen. Qualified data features (e.g. percentiles) may come after league-wide ingestion.

## Module C — Teams (`/teams`, `/teams/:teamId`)

- **C01:** Complete active team directory with logos/abbreviations only where imagery usage rights allow; stable text-only fallback.
- **C02:** Team identity, city, conference/division, franchise history fields where source coverage supports.
- **C03:** Season roster with player links and season selection.
- **C04:** Team schedule and game results; filter home/away.
- **C05:** Record, win percentage and recent form based on verified games or standings feed.
- **C06:** Team box score aggregates and shooting percentages where inputs exist.
- **C07:** Offensive/defensive rating, pace and net rating only if sourced/calculable.
- **C08:** Team leaders in points, assists, rebounds and available metrics.
- **C09:** Team-versus-team statistical comparison with equal seasons/scope.
- **C10:** Roster position distribution and age/experience if metadata permits.
- **C11:** Team historical seasons and notable records where supported.
- **C12:** Cross-link roster players and game opponents throughout the site.

**Minimum accepted slice:** real team directory, team details, roster, schedule/results, documented source mapping, navigable links. All 30 current teams must be accounted for with correct current identities; do not assume historic aliases are current.

## Module D — Games & Match Center (`/games`, `/games/:gameId`)

- **D01:** Calendar/date selector, recent/upcoming games.
- **D02:** Scoreboard states with periods, clocks and status flags when supplied; don't show clocks for feeds lacking them.
- **D03:** Stable game detail route, teams, venue/time when supplied, score breakdown.
- **D04:** Player/team box score table, with shooting attempts/percentages and totals where data exists.
- **D05:** Quarter-by-quarter scoring.
- **D06:** Play-by-play feed with period, clock, event category, actors and score.
- **D07:** Derived scoring-run identification; document heuristic and event coverage.
- **D08:** Lead changes, largest leads, ties and momentum timeline from ordered scoring events.
- **D09:** Player and team game-high performers.
- **D10:** Head-to-head historical meetings when source supports.
- **D11:** Regular/postseason game separation.
- **D12:** Play-by-play scrubber or event-index navigation (plain implementation; sophisticated visual timeline later).
- **D13:** Quick links from game to player/team pages.
- **D14:** Canceled/postponed games, overtime, incomplete clock, no-score and unplayed-game states.

**Minimum accepted slice:** date-based game list, game details, valid result/status semantics, box scores from a verified source, direct-load navigation and tests. Advanced event animation is _not_ part of this shot.

## Module E — Standings & League Leaderboards (`/standings`, `/leaders`)

- **E01:** East/West standings with current season selection, W-L and pct.
- **E02:** Home/away, last 10, streak, games behind where actually provided or accurately derived.
- **E03:** Team ranking table and metric switcher.
- **E04:** Player leaders: PTS, REB, AST, STL, BLK, 3PM, TS%, FG%, 3P% and additional available metrics.
- **E05:** Per-game, totals, per-36, per-100 modes where accurately supported.
- **E06:** Qualifier/minimum-games or attempts controls; provide defaults and explanation.
- **E07:** Season and regular/playoff filters where available.
- **E08:** Position/team filters with historically appropriate eligibility.
- **E09:** Sort/search/pagination and CSV exports.
- **E10:** Historical single-season leaderboards and record links.
- **E11:** Rank movements only with comparable dated snapshots (never invent yesterday's position).

**Minimum accepted slice:** sortable, filterable season player leaderboards and verified standings. Numeric order must be correct for negative/decimal metrics, missing values and minimum qualifications.

## Module F — Comparison Lab 2.0 (`/lab/compare`)

**Preserve existing `/compare` completely.** The new lab is a separate feature route until design integration is approved.

- **F01:** Add/remove 2–4 players with identity disambiguation and duplicate prevention.
- **F02:** Choose comparable seasons per player, with clear one-season vs career modes.
- **F03:** Select stat categories and exact metrics, with definitions.
- **F04:** Numeric side-by-side table with units, scope and missing-data placeholders.
- **F05:** Multiple stat trend lines with shareable selection state.
- **F06:** Radar/normalized comparison only where coherent common population denominators exist.
- **F07:** Peak-season comparison using an explicit peak criterion, not cherry-picked unexplained years.
- **F08:** Playoff vs regular-season comparison with stated coverage.
- **F09:** Era-adjusted versus raw-stat toggle with model description.
- **F10:** URL share/reload and CSV/PNG export where available.
- **F11:** Sample-size warnings and metric footnotes.
- **F12:** Player and team deep links.

**Minimum accepted slice:** functional multi-player season picker, 2–4 player stats comparison, missing-value logic, shareable URL, unit-tested comparison state. Chart embellishment is a later design task.

## Module G — Shot Chart Studio (`/lab/shots`)

**High-value visual/data capability; do not fake if shot source is unavailable.**

- **G01:** Fetch and normalize authentic shot attempts including player/game/season and coordinates.
- **G02:** Court coordinate system with documented NBA orientation/scaling and team side consistency.
- **G03:** Make/miss shot dots in simple SVG or canvas with accessible table alternative.
- **G04:** Filter by player, season, date, opponent, team, shot type, distance, playoffs, available zones.
- **G05:** Shot zone summary: attempts, makes, FG%, correct denominator.
- **G06:** Density/hex-bin heatmap using genuine coordinates, not arbitrary random placements.
- **G07:** Two-player overlays or side-by-side maps with clear legend and matching scope.
- **G08:** Per-game shot selection only where shot-to-game identifier exists.
- **G09:** League-average zone comparison only when representative league dataset available.
- **G10:** Export shot data (bounded) and visualization with source attribution and coverage disclosure.

**Minimum accepted slice:** real observed shot positions, filters, counts and genuine FG% matched to filter results. If unavailable after bounded research, implement **only** honest capability/status messaging and record `DATA_BLOCKED`; do not fabricate a heatmap. Continue to other modules.

## Module H — Advanced Analytics Laboratory (`/lab/analytics`)

- **H01:** Stat glossary and formula metadata, supported input requirements.
- **H02:** eFG%, TS%, AST/TO and other mathematically supported derived values.
- **H03:** Scatter explorer: x/y metric, season, qualifier, player filter, accessible equivalent table.
- **H04:** League distributions and player percentile marker with sample sizes.
- **H05:** League/team splits and position cohorts with defensible definitions.
- **H06:** Custom weighted ranking builder (direction, weights, normalizations, formula preview).
- **H07:** Correlation explorer, labeled descriptive not causal.
- **H08:** Side-by-side season trend visualization, honest missingness.
- **H09:** Download filtered datasets (bounded and only where redistribution rights permit).
- **H10:** Save/share analysis query via URL or local storage.
- **H11:** Data coverage explorer with source/provenance and last-updated metadata.

**Minimum accepted slice:** valid metric calculations, usable scatter with exact-value table, basic customizable rankings, URL-persisted filters and tests.

## Module I — NBA History & Time Machine (`/history`)

- **I01:** Season index and selectable historical seasons with verified available range.
- **I02:** Historical league statistical leaders and team rankings.
- **I03:** Record book by category with regular/playoffs scope.
- **I04:** Historical player profiles linked to existing player identities where mappings are reliable.
- **I05:** Decade/era browse and season comparison.
- **I06:** Historical franchise/team identity and relocation consistency.
- **I07:** Draft classes, picks and players, only with verified source fields.
- **I08:** Awards/championship history with independent verified source data.
- **I09:** Record progression over time and tied-record treatment.
- **I10:** Normalized cross-era comparisons with transparent caveats.
- **I11:** Coverage-by-season explorer: don't pretend every stat existed in 1946.

**Minimum accepted slice:** historical season navigator, real league/team/player leaders for supported seasons, comparison links, explicit coverage and tests. Do not download massive archives if only tiny slices are necessary.

## Module J — Lineup & Roster Laboratory (`/lab/lineups`)

- **J01:** Select team and season; inspect roster.
- **J02:** Five-player lineup lookup based on _verified lineup possessions/events_, not guessing from roster membership.
- **J03:** Minutes together and possession count if sourced.
- **J04:** Lineup offensive/defensive/net rating if correctly sourced or derived.
- **J05:** On/off splits with real substitution and possession information.
- **J06:** Compare two observed lineups under matching definitions.
- **J07:** Filter for minimum possessions/minutes to reduce noise.
- **J08:** User-selected _hypothetical_ five-man groups, visibly labeled as hypothetical; show identity and available aggregate summaries but **never invent their joint statistical performance**.
- **J09:** Dataset coverage and no-lineup-data state.

**Minimum accepted slice:** functional team/roster five-player selection with clearly hypothetical labeling and observed-lineup lookup only when verified. If play-by-play substitutions are incomplete, **do not produce fabricated net ratings**. Honest limited scope is acceptable.

## Module K — Discover, Similarity & Statistical Stories (`/discover`)

- **K01:** Statistically similar player seasons from transparent standardized metrics.
- **K02:** Unusual single-game performances from verified game records, with thresholds shown.
- **K03:** Career milestones and recent records from supported totals.
- **K04:** Player/season random discovery without broken links.
- **K05:** Category-specific under-the-radar seasons with stated selection criteria.
- **K06:** Interesting league-trend charts with source/date attribution.
- **K07:** "On this day" historical games if verified calendar/event data exists.
- **K08:** Curated but generated-by-query statistical insights with click-through evidence; avoid unsupported sensational claims.
- **K09:** Shareable discover filters.

**Minimum accepted slice:** similarity, random player discovery and interesting-game queries with accurate provenance. Avoid language-model-generated "facts" without data verification.

## Module L — My NBA (local-first) (`/my-nba`)

- **L01:** Favorite players, teams and pages using local storage safely.
- **L02:** Recently viewed items where tracking is opted into local-only behavior; no server analytics required.
- **L03:** Save and restore comparison settings.
- **L04:** Save and restore leaderboard filter presets.
- **L05:** Save named analytics investigations/queries locally.
- **L06:** Bookmark specific games and historical seasons.
- **L07:** Import/export preferences as validated JSON, with versioning and error handling.
- **L08:** Reset/clear local data with confirmation.
- **L09:** Shareable links for appropriately URL-encodable research states, independent of local bookmarks.
- **L10:** Optional configurable low-motion preference if it can be introduced without affecting legacy global styling.

**Minimum accepted slice:** robust favorites + saved comparisons/filters + export/import that survives reload and invalid stored JSON. **Do not introduce accounts/authentication/cloud sync in SHOT 1** unless a demonstrated requirement absolutely demands them; local-first is adequate and free.

---

# 7. IMPLEMENTATION ORDER — AN OVERNIGHT WORK PLAN

Do **not** use the feature table as permission to randomly implement dozens of disconnected pages. Implement in dependency order, aiming for the maximum number of complete vertical slices with honest data.

## Milestone 0 — Recon and preservation gate (required first)

- Read repo, inspect clean/dirty status, check branch, runtimes, scripts, docs and existing provider/routes/contracts.
- Run baseline install/validation where feasible, record exact results.
- Create safe feature branch/worktree.
- Identify protected visual files and existing screenshots; snapshot old-route appearance if tooling allows.
- Create `HANDOFF.md` and expansion docs skeleton **with real initial contents**, not blank TODOs.
- Produce a concrete dependency-aware task queue and feature ledger sorted by value/data feasibility.

**Gate:** baseline and safety state known; existing design preservation strategy recorded; branch safe.

## Milestone 1 — Source research and architectural spine

- Probe a handful of candidate free sources under request limits; start with NBA.com existing path, ESPN scoreboard/game feed and NBA Live.
- Investigate current supported params for league standings and league leaders before implementing.
- Write data audit, free-rights matrix and first nontrivial feature-coverage decisions.
- Introduce source metadata, ID mapping conventions, typed service interfaces and tests.
- Establish predictable source error categories and typed capability report.
- Build real fixture cases corresponding to observed source shapes (remove secrets and honor source redistribution rules); no network in unit tests.

**Gate:** one verified or properly degraded source per early domain; reproducible source tests; no original-provider regressions.

## Milestone 2 — Teams and games foundation

- Team directory, team details and basic roster; date-driven scoreboard and game-detail page.
- Actual tested provider adapters, Zod contracts, Express endpoints and TanStack Query hooks.
- Plain `/explore`, `/teams`, `/teams/:id`, `/games`, `/games/:id` routes.
- Source identity cross-mapping, dates and game status correctness; team/player/game links.
- Deterministic unit/integration tests for success/empty/error/invalid IDs.

**Gate:** navigate from explorer to an actual team, roster player, game and back; direct refresh works; source provenance shown.

## Milestone 3 — Standings and leaderboards

- Verified league standings source and season selection.
- Verified league player/team aggregate source, qualifier rules, sortable accessible rankings.
- Basic team season stats; cross-link leaders to profiles/teams.
- Tests for sorts, filter qualifying, ties, traded players and missing metrics.

**Gate:** results reflect valid records and requested season/scope; controls operate; no static mock rankings presented as live.

## Milestone 4 — Player Insights 2.0

- Expanded player game stat model where source permits, rolling performance, home/away, W/L, opponent and date splits.
- Season highs, milestones if full records exist, team history and advanced derived metrics.
- Put new UI at `/players/:playerId/insights`; legacy `/players/:playerId` remains visually unchanged.
- Test fixture edge cases for zero games, one game, mismatched team IDs, traded seasons and missing attempts.

**Gate:** insight page works for real players and honest missing-player cases; no bad math or old-page regression.

## Milestone 5 — Comparison Lab 2.0

- Multi-player selection and season-aware stats comparison with data reconciliation.
- URL state, clear missing data, comparison table, basic trend chart and export.
- Preserve all legacy `/compare` behavior and presentation.

**Gate:** stable direct links and correct 2–4 player comparisons with tests.

## Milestone 6 — Analytics Lab + statistical core

- Source-appropriate calculations, metric glossary, scatter explorer, distribution chart/table, custom ranking builder and URL state.
- Cross-domain analytics methods with unit tests, provenance and coverage warnings.

**Gate:** calculators reproducible and unit-correct; ranked results demonstrably derived from the shown inputs.

## Milestone 7 — Shot Studio (conditional on genuine shot data)

- Source probe and shape validation; build real shot view and filters if available.
- If unavailable, record precise blocker and move on, rather than improvising a false chart.

**Gate:** observed shots reconcile with zone totals, or status honestly `DATA_BLOCKED`/`EXTERNAL_ACCESS_BLOCKED`.

## Milestone 8 — Historical explorer

- Investigate the minimum viable legitimate dataset/import path and avoid oversized archives.
- Build historical season browser/leader tables/source coverage; add records/drafts only with verified coverage.
- Efficient compressed imports or preaggregation, startup performance and size checks.

**Gate:** multiple genuine past seasons navigable, coverage labels correct; imported datasets validated.

## Milestone 9 — Discover / Player DNA / lineups

- Similarity, peer distribution and milestone discovery once sufficient aggregate data exists.
- Player DNA with actual qualified league cohort.
- Lineup screen only to the depth supported by observed lineup/possession records. Hypothetical roster tool clearly not predictive.

**Gate:** each screen's claims match available data; sample sizes and missingness clear.

## Milestone 10 — My NBA + export and filters

- Local-first favorites, saved comparisons and analytics states.
- Versioned import/export, corruption recovery and keyboard accessibility.
- Avoid account/backend persistence complexity.

**Gate:** works after reload with storage fallbacks; no personal data sent to an outside service.

## Milestone 11 — Integration pass, correctness and performance

- End-to-end journeys across all new sections; direct navigation and URL refresh; mobile basic usability; loading/unavailable/error handling.
- Route/link crawl for dead pages; API contract verification; duplicate/mismatched data source checks.
- Thin performance profiling; pagination, lazy route loading where justified, upstream request budgets, caching and large dataset memory checks.
- Full `npm run validate` and additional functional checks. Fix real defects and reduce flaky tests.
- Verify old page appearance and behavior remained unchanged.

**Gate:** no known critical broken routes/incorrect NBA stats; test evidence accurate.

## Milestone 12 — Stable handoff, no redesign

- Audit every feature ID and mark its exact completion status with evidence.
- Produce source audit, API catalog, calculations documentation, verification log, design handoff, release notes.
- Ensure root `HANDOFF.md` describes next action with exact commands/paths.
- Commit coherent final checkpoint on feature branch. Do not merge/deploy `main`.

**Gate:** another engineer or agent can restart without interpretation; no misleading blanket "complete" statement.

### Priority adaptation / failure rule

If some data source is blocked, **do not loop on it for hours**. After a small bounded attempt and documented alternatives, mark the blocker and work on the next independent milestone. In particular, `shotchartdetail`, advanced tracking, historic drafts, or lineups must not prevent completion of teams, games, standings, players, analytics, and My NBA.

### Ambition rule

The entire platform is the desired scope, but execution capacity is finite. **Maximize credible completed functionality, not number of files or screenshots.** Never trade reliability, existing-user experience or data integrity for an artificial checkbox count.

---

# 8. VERIFICATION STRATEGY — PROVE FUNCTIONALITY, NOT JUST RENDERING

## 8.1 Test pyramid

For every new domain, add the appropriate tests at each layer:

1. **Pure unit tests:** domain arithmetic, sorting, ranking, filtering, rolling windows, identity mapping, season/date parsing, source freshness, edge cases, nil and partial values.
2. **Source mapping tests:** captured/sanitized representative source shapes, upstream field changes, truncated/empty bodies, malformed numerical values, duplicate IDs, missing required columns, result envelope differences.
3. **Provider service tests:** caching, error classification, multiple-source selection, unsupported capabilities, validation, cancellation/timeouts; controlled mock responses only.
4. **Express route tests:** status codes, validated query params, pagination/limits, source metadata and non-leakage of secrets/raw upstream bodies.
5. **Frontend component/page tests:** success, partial, empty, error and loading states; keyboard navigation; filter changes; chart-table parity; direct links and URL serialization.
6. **Browser journeys where available:** desktop and mobile page navigation, direct refresh on dynamic routes, `/explore` links, forms, filters, history, exports and local storage.
7. **Small manual live probes:** separately opt-in, limited count, show actual source access and representative values. **Do not make live NBA.com/ESPN/CDN fetches part of ordinary deterministic CI.**

### Existing commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run validate
git diff --check
```

Do not modify `npm run validate` to remove tests or weaken strictness. Prefer tests over suppressing TypeScript/ESLint failures. Avoid fragile sleep-based race tests; use controlled clocks and mocked fetch.

## 8.2 Must-cover fixture and live-smoke scenarios

| Scenario                                       | What to verify                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| Active star with rich recent data              | Every supported player screen and advanced metric is correctly computed               |
| Known valid profile but missing career seasons | Honest unavailable state; no bogus zero career; regression test                       |
| Newly drafted or minimally recorded player     | No division by zero, confusing empty panels, or 404 when profile exists               |
| Player traded midseason                        | Correct current team, multi-team seasons, aggregate vs split rows and no double count |
| Retired historical player                      | Old team names, incomplete modern fields, time scope and source coverage              |
| Team relocation or renaming                    | Canonical identity mappings and historical display names                              |
| Game before tipoff                             | No invented score; pregame status and lineup/boxscore not fabricated                  |
| Live game with shifting score                  | Proper `asOf`, period/clock and refresh policy; no stale-as-live                      |
| Finished overtime game                         | Period totals, regulation/overtime handling, final state                              |
| Postponed/canceled game                        | Appropriate status without an incorrect 0–0 final                                     |
| Current standings/league leader                | Numeric correctness, qualifications and date/season labels                            |
| Shot attempt with absent coordinates           | Exclude from geospatial chart but disclose coverage                                   |
| Cross-source conflict                          | Surface discrepancy or source precedence; never silently mix unmatched denominators   |
| Network timeout/403/429/non-JSON               | Bounded retry/degrade, sanitized response, no request storm                           |
| Invalid URL filter/ID                          | Typed 400/404 or safe client fallback, no crash                                       |
| Missing or corrupted local storage             | Safe defaults, working app and recoverable error                                      |
| Time zone/DST boundary                         | Correct scoreboard date, game clock/time and season transitions                       |
| Large resultset / slow source                  | Bounded pagination, cache, minimal client payload, graceful loading                   |
| Small phone and keyboard-only user             | Usable controls, real table semantics, navigable focus, no horizontal trap            |

## 8.3 Formula assertions

At least one direct hand-calculated case for each derived metric implemented: TS%, eFG%, rolling averages, weighted season totals, percentile, rankings, win percentage, per-36, series comparisons, team records, shot-zone percentage and similarity. Confirm precision/rounding matches user-visible labels. Test zero attempts, zero minutes, missing stats, minimum sample, negative values, tied ranks, duplicate source rows and split seasons.

## 8.4 Feature acceptance contract

A feature is `DONE_VERIFIED` only when:

- Real source dataset or appropriate local-first functionality exists, with supported license/usage conditions.
- An accessible, working page/control or legitimate backend computation implements it.
- Correct ID/date/season/filter semantics and shareable navigation (where relevant) exist.
- Data is clearly distinguished as real, stale, incomplete, unavailable or derived.
- Relevant unit/contract/component/route tests ran and passed, or the exact missing tests are recorded and status reduced to `PARTIAL`.
- Major edge cases have explicit handling.
- The feature is documented and its data coverage is stated.
- It introduces no unwanted change to the original visual pages.

The **whole SHOT 1** is not complete merely because the milestone list is checked. Record whether each module meets its minimum accepted slice and which advanced requirements remain.

## 8.5 Real-data smoke test protocol

Create a bounded CLI probe, ideally runnable manually as e.g. `npm run smoke:free-sources` (naming at your discretion):

- Not part of `npm test` or regular GitHub Actions.
- No hard-coded secrets; no raw sensitive response dumps.
- Requests a few representative known players, teams, historical dates and recent games; validates response contracts, IDs, counts and update stamps.
- Separate `local` and, if possible, `production-host` evidence. Do not pretend the latter happened if unreachable.
- Back off and stop on repeated source errors; publish a concise sanitized report.
- Respect fair-use and access policies.

## 8.6 Original visual regression gate

Write `docs/expansion/ORIGINAL_DESIGN_PRESERVATION.md` containing:

- Protected routes/files and initial Git baseline SHA.
- List of protected-file diffs (expect **none**, except justified nonvisual route integration).
- Whether screenshot comparison was actually performed, browser/tool and viewport details, result and limitations.
- Original tests rerun and results.
- Any differences that still need user review.

The absence of an installed screenshot tool is **not** permission to restyle the original app.

---

# 9. QUALITY, PERFORMANCE, SECURITY AND OPERATIONS

## 9.1 API reliability and free-rate budgeting

- Respect timeouts, limited concurrency, upstream policy and visible source freshness.
- Deduplicate in-flight requests using the repository's existing caching approach.
- Do not request a player's entire historical game log on every page reload or every filter keystroke.
- Avoid fetching all player career records one-by-one to create a leaderboard when a league-wide source or preaggregated permissible dataset exists.
- Put hard bounds on page size, metric count, IDs per request, date ranges, response size and historical imports.
- Add retry only where appropriate: limited transient failures with backoff+jitter, never persistent repeated 403 or use of evasion tactics.
- Cache historical records longer than mutable current-season stats. Surface failed refreshes explicitly.
- Avoid pulling gigabytes into Git or deployment build. Keep bulky downloaded datasets out of Git unless small, license-compliant, intentionally committed, documented and needed.
- Use source and derived-result cache keys that include full normalized scope and season context. Do not confuse regular season with playoffs.
- Gracefully degrade a failing module without crashing the entire site.

## 9.2 API security and correctness

- Validate all request inputs, especially query filters, ISO dates, season IDs, sort fields, external identifier strings and batch sizes.
- Never accept an arbitrary URL as a proxy destination. Allowlist providers and endpoint paths; prevent SSRF.
- Avoid reflecting upstream HTML or raw errors in user-visible content.
- Never expose credentials, cookies, raw request headers, signing tokens or uncontrolled raw provider payloads.
- Sanitize logs and diagnostic output; use concise status/schema counts rather than secrets.
- Apply safe frontend escaping and avoid `dangerouslySetInnerHTML` for upstream text.
- Keep local import/export JSON size-bounded and schema-validated; use versioned schemas.
- Ensure data imports verify schemas and detect corrupted/partial downloads; no blind remote code execution of dataset repositories.
- Audit new third-party dependencies before use; prefer existing packages and platform primitives.
- Do not use free API infrastructure for unauthorized scraping or redistribution.

## 9.3 Accessibility baseline on new pages

- Semantic headings, labels, navigation landmarks, accessible table headers, keyboard-operable controls and visible focus.
- Charts need accompanying exact-value tables or textual summaries where appropriate.
- Color never carries meaning alone. Manage contrast and source/error labels.
- Filter modifications visibly update data and loading state; no inert buttons.
- Provide pagination labels, empty results, explicit sorting direction and form error explanations.
- Respect reduced-motion preference. Keep this phase's animations minimal.
- Mobile responsiveness means no hidden essential columns without an accessible alternative.

## 9.4 Performance discipline

- Build with production bundles and check known Vite/Recharts chunk warnings, but do not destabilize the old app just to silence them.
- Lazy-load new route-level modules where a genuine bundle-size benefit exists.
- Virtualize/paginate large tables only when appropriate, with keyboard and screen-reader implications considered.
- Do not pre-fetch every team/player/game on the homepage.
- Prefer normalized analytic aggregates and sampled visualizations for huge datasets with clear coverage notes.
- Record rough size, network and first-render observations rather than invent performance improvements without measurement.

## 9.5 Operations and deployment

- Keep `render.yaml` unchanged unless absolutely required to run new features without cost, and justify every change. Never alter production source provider to fixtures.
- Do not edit live environment variables or deploy new revisions from `main` automatically.
- Confirm new frontend routes will resolve to the existing SPA fallback under the current Express hosting configuration.
- Do not require an always-on scheduler, paid redis, external SaaS or persistent writable disk on Render free plan.
- Create operational runbooks for dataset updates, source failure triage, cache invalidation, cold starts, local fixture mode, and restoring stable feature flag behavior.
- Where rollout safety is needed, add explicit opt-in capability flags with safe default behavior, but don't quietly hide incomplete features and call them shipped.
- Preserve the existing live player search and comparison correctness even if external additional modules fail.

---

# 10. DOCUMENTATION OUTPUTS — REQUIRED, NOT OPTIONAL

Create and continually update these files in the feature branch. They should contain actual observed results and verifiable statuses, not a filled-in promotional fantasy.

## `HANDOFF.md` (repository root, authoritative continuation state)

This is the single most important operational artifact. It must be updated repeatedly, not created once at the end.

Required headings:

```markdown
# NBA Performance Explorer 2.0 — Engineering Handoff

## Snapshot timestamp / branch / HEAD / base commit

## Working tree and pending changes

## Goal and non-negotiable constraints

## Verified baseline and last validation results

## Completed commits and shipped-on-branch vertical slices

## Current milestone and exact in-progress task

## Feature ledger summary (counts by status)

## Data sources (verified, conditional, blocked, rejected)

## Architecture and important decisions (with file pointers)

## Files changed in current work session

## Tests and exact commands/results

## Known bugs, security concerns and reliability limitations

## Protected original UI baseline and visual check status

## Next task queue (ordered)

## Single NEXT ACTION (one exact command or file/task to open)

## Continuation prompt for a new Codex session
```

Never assert the tree is clean unless `git status --short` confirms. Record exact HEAD rather than relying on memory. Include any local-only/uncommitted work. On every new work session, read `HANDOFF.md` before implementing; verify its claims with Git because it may be stale after interruption.

## `docs/expansion/FEATURE_LEDGER.md`

Maintain a structured feature-by-feature table:

`ID | Feature | Module | Status | Route | Backend endpoint / input | Data source | Coverage | Tests | Commit | Risks / next action`

Use exact statuses (`DONE_VERIFIED`, `DONE_FIXTURE_ONLY`, `PARTIAL`, `DATA_BLOCKED`, `EXTERNAL_ACCESS_BLOCKED`, `NOT_STARTED`, `DEFERRED_BY_PRIORITY`). At each milestone tally by category. **Don't report 70+ features delivered by counting proposed features.** Distinguish usable capability from roadmap wish.

## `docs/expansion/FREE_DATA_SOURCE_AUDIT.md`

Use the template in Section 4.3. Include explicit access and legal/terms caveats, current status and when verified. Document the difference between test environment, local machine and deployment-host success.

## `docs/expansion/FEATURE_DATA_MATRIX.md`

Crosslink to feature IDs in Section 6, list required vs actually available fields, source fallback rules and unsupported cases.

## `docs/expansion/API_CATALOG.md`

For each new internal backend endpoint, document path/method, parameters/defaults, response schema, examples with fixture indicators, source, cache TTL/freshness, errors, known scope/coverage, dependencies and tests. Do not expose raw provider identifiers without their namespace.

## `docs/expansion/CALCULATIONS.md`

Math definitions, input requirements, missingness, precision, scope, qualification, tests and cautions. Provide at least one verified sample calculation per novel metric family.

## `docs/expansion/ORIGINAL_DESIGN_PRESERVATION.md`

Baseline, protected route list, changed protected files (if any), screenshot comparison evidence and honesty about missing visual tooling.

## `docs/expansion/VERIFICATION_LOG.md`

Include actual commands, execution dates, platform details, counts, pass/fail, CI limitations, live probe outcomes, browser/e2e checks, known failed tests. Make this traceable and concise; avoid 100 KB of unfiltered logs.

## `docs/expansion/DESIGN_HANDOFF_FOR_CLAUDE.md`

This is specifically for **SHOT 2 visual design**:

- Overview of new routes and user journeys, each with status.
- Existing original screenshot assets and protected visual DNA.
- New UI interaction inventory (forms, filters, states, modals, tables, charts, navigation).
- Real data objects, sample shapes and provenance limitations designers must respect.
- Which screens need large charts, tables, small-screen representations and unavailable-data UX.
- Screenshots of working plain implementation if captured; how to run locally to view.
- Clear instruction: **do not break contracts, alter statistics or move core business logic into visual components.**
- Exclude unapproved visual opinions: Claude and the user will choose style, hierarchy, transitions and layout next.

## `docs/expansion/RELEASE_NOTES_ENGINE.md`

Human-readable account of actual working modules, notable backend integrations, measurable testing, what was left for Shot 2, and limitations. Avoid marketing that overstates coverage.

### Existing docs policy

Update `docs/PROJECT_STATE.md` with this branch's factual state and append accepted/superseding entries to `docs/DECISIONS.md` as appropriate. Do not erase historical ADR decisions; if this expansion changes old MVP non-goals, add a new expansion ADR/spec section explaining that the 2026 MVP exclusions apply to the original scope and are intentionally superseded for 2.0. Preserve accurate old delivery history. Update README minimally for developer onboarding to `/explore` and expansion status **without redesigning README imagery or claiming the unmerged branch is live**.

---

# 11. RESPONSIBLE AUTONOMY / DECISION POLICY

## You should decide and execute autonomously when:

- Naming modules, designing typed interfaces, writing tests and contracts.
- Choosing one verified free dataset over another with documented reasons.
- Choosing pragmatic data representation, pagination and caching bounds.
- Simplifying a blocked advanced feature to its genuinely supported subset.
- Fixing bugs exposed by your work, provided the existing product remains intact.
- Prioritizing a high-value module over a blocked or expensive path.
- Writing documentation and checkpoint commits on a safe feature branch.

## You must stop and request authorization (or avoid action) when:

- Required action would incur any money, sign up for a trial that can become paid, or enable billing.
- A license/ToS forbids the planned access/redistribution or eligibility is uncertain enough to create a material risk.
- You would need to modify deployment secrets, third-party account settings, production DNS/services, merge/main, force push, or delete user data.
- A supposed solution requires evading access controls, rotating identities/proxies, extracting hidden cookies or bypassing anti-bot systems.
- Existing dirty user changes cannot be safely isolated.
- A breaking redesign to existing protected pages seems necessary. **Do not make that change; describe it for Shot 2.**

If blocked by authorization, continue independent work and mark the blocked item accurately. Don't endlessly ask the user to make routine decisions while an overnight run is intended.

### Do not game the task

Forbidden shortcuts:

- Replacing broken data with made-up JSON labeled "live".
- Using fixtures automatically in production when live fetch fails.
- Exposing a clickable UI control that does nothing or always returns fixed canned output.
- Saying "implemented" because a route file exists with `Not implemented yet`.
- Faking source smoke tests or copying expected results without executing.
- Editing tests solely to reduce assertions, skipping critical failures, or downgrading TS/ESLint strictness.
- Deleting old test suites or changing existing page visuals to force compatibility.
- Reporting production-ready when source access from the deployment environment hasn't been verified.
- Creating giant data downloads just to look busy.
- Using an LLM to invent statistical stories or historical game records.
- Generating arbitrary Git commits, backdating author dates or hiding unfinished work.

A feature that cannot be supported for free should remain explicitly unsupported; the rest of the app must still work.

---

# 12. AVOID THESE HIGH-RISK NBA-SPECIFIC PITFALLS

1. **Player ID mismatches:** NBA.com and ESPN identifiers are different namespaces. Crosslink by verified identifiers/mapping, not names alone. Watch accented names, Jr./III, duplicate surnames and midseason team changes.
2. **Teams across eras:** Current 30-team directory is not the same thing as historical franchise names. Respect relocations and franchises when calculating history.
3. **Game dates:** NBA games can extend across midnight and are published in Eastern time or UTC; expose local viewer time and league/game-date semantics distinctly.
4. **Season boundaries:** NBA preseason, regular season, play-in, playoffs and summer league are different scopes. Current repository computes `currentNbaSeason()` by October boundary; verify if that is appropriate for each new feature and annotate exceptional league dates.
5. **Boxscore timing:** Live boxscores may omit players, partial minutes or advanced stats. Do not treat missing fields as zero.
6. **Averages:** A season shooting percentage generally must be derived from aggregated makes/attempts; do not average game percentages equally.
7. **Traded players:** Player-total rows and team split rows must be reconciled to avoid double counting.
8. **Advanced NBA metrics:** PER, PIE, BPM, VORP, usage, lineup net rating, win probability and on/off are not interchangeable or trivially inferred from PPG. Label sourced metrics with provider convention and calculated metrics with formula.
9. **Shot locations:** Court geometry, feet/coordinate scaling, orientation and temporal availability vary by data feed. Reconcile before plotting.
10. **Play-by-play:** Event timestamps, period ordering, sub-events, official reviews and score corrections can produce tricky timelines. Verify monotonic score reconstruction and period boundaries.
11. **League ranks:** Season thresholds differ by stat. Provide explicit qualifications and never create a list that appears official while including players who are ineligible.
12. **Historical stat coverage:** Three-pointers were not always present; defensive stats and tracking data began at different dates. `0` means recorded zero; `null` means unavailable.
13. **Images and marks:** Current app contains NBA-themed marks and a curated registry. Do not bulk-download player likenesses or logo imagery without rights/terms review. Plain text is fine this shot.
14. **Live feed usage:** An undocumented public endpoint might be reachable today and blocked tomorrow. Cache responsibly and expose source/time status.
15. **Cross-source discrepancy:** Two feeds can have different game stat revisions, official scoring corrections, rounding or season definitions. Do not average disagreeing values.
16. **Data size:** Shot records and historical play-by-play can be huge; paginate, limit, preaggregate or selectively import. Do not turn the free deployment into an unbootable monolith.
17. **CORS:** Browser must continue calling same-origin `/api`; fetch outside data through Express server only. Do not leak external API raw shapes to React.
18. **Original home route:** Existing `*` fallback renders `FoundationPage`. When adding explicit routes, preserve its homepage behavior but consider a proper 404 for unknown _new_ paths without changing the old visual homepage unexpectedly. Document whichever backward-compatible choice you use.
19. **No old UI regressions:** `AppHeader` has route-specific navigation logic and accessibility-sensitive mobile menu. Reuse it unchanged; put new plain navigation inside new route containers.
20. **Real time and cold starts:** The free Render service can sleep. Don't call stale data "live" when waking or before first successful refresh.

---

# 13. PRACTICAL END-TO-END ACCEPTANCE WALKTHROUGHS

Implement real proof journeys and record them in `VERIFICATION_LOG.md` (manual or automated; never claim what was not executed):

### Journey 1 — Old site untouched

Open `/`, search a player, load `/players/:playerId`, change season, inspect career chart and game log, open `/compare`, compare players, refresh and share URL. Confirm original style unchanged, no errors and existing data-state behavior intact.

### Journey 2 — Daily fan

Open `/explore` → games → choose a real supported date → choose game → inspect final/live/pre status → navigate to player/team profile → return to schedule. Verify time labels, source attribution and direct refresh.

### Journey 3 — Team explorer

Open `/teams` → pick a team → choose season → view roster → open player insight → return → inspect season schedule and record. Confirm ID mapping and season correctness.

### Journey 4 — Stat analyst

Open `/leaders` → choose year, metric, minimum qualifiers → sort table → open top player → view rolling form, home/away split, personal best → back to rankings. Verify numeric and data coverage logic.

### Journey 5 — Comparison researcher

Open `/lab/compare` → add 3 distinct players → choose seasons → inspect equal-unit metrics → switch metric → share URL → refresh → confirm same comparison and graceful missingness.

### Journey 6 — Advanced analysis

Open `/lab/analytics` → select TS% (or another genuinely supported metric) → inspect definition and source fields → generate scatter/leaderboard → adjust weights → verify rows change deterministically → export results if legally permitted.

### Journey 7 — Shot explorer (if verified)

Open `/lab/shots` → select player and season with supported real attempts → show made/missed map → filter opponent → verify attempt count, makes and FG% reconcile with exact-value table. If data unavailable, demonstrate truthful coverage/error state, not dummy court activity.

### Journey 8 — Historical fan

Open `/history` → choose a verified historical season → view league leaders → navigate to player stats → compare with a modern season → inspect explicit era/coverage notes.

### Journey 9 — Returning visitor

Open `/my-nba` → favorite two players and a team → save analysis filter → reload → restore → export local data → import valid and invalid JSON → confirm safe behavior.

### Journey 10 — Host or data outage

Simulate ESPN/NBA.com timeout or 403 in tests → the affected route displays an honest unavailable state, app navigation continues, older pages still work, no fake substitutions or crash, no repeated high-volume retry.

---

# 14. FINAL OUTPUT CONTRACT — REPORT TO THE USER HONESTLY

At the end of the run, supply a concise yet substantive engineering report in the coding environment's normal response. It must include:

1. **Repository:** branch, exact current HEAD, base commit, clean/dirty tree.
2. **Work completed:** implemented feature IDs grouped by module, with links/paths and distinction between genuinely verified and fixture-only behavior.
3. **Free data sources:** which specific feeds actually passed and in what environment, whether host access was tested, and their known terms/limits.
4. **New routes:** working page routes and main backend endpoints.
5. **Tests:** exact commands run, last pass/fail state, test totals when known; don't invent counts.
6. **Design preservation:** old routes unchanged, protected-file diffs and actual screenshot check status.
7. **Remaining work:** data blockers, incomplete feature IDs, deferred tasks and highest-severity defects.
8. **Handoff:** root `HANDOFF.md` location, `FEATURE_LEDGER.md`, `DESIGN_HANDOFF_FOR_CLAUDE.md`, and **single next command/action**.
9. **Deployment:** explicitly state **NOT DEPLOYED / NOT MERGED** unless separately authorized and verified.
10. **No false completeness:** state whether SHOT 1's minimum vertical slices passed, which didn't, and why.

Recommended exact report ending:

```text
SHOT_1_ENGINE_STATUS=<WORKING_BUT_INCOMPLETE | FUNCTIONAL_CORE_COMPLETE | BLOCKED>
BASE_COMMIT=<sha>
BRANCH=<name>
HEAD=<sha>
WORKTREE=<clean | dirty, describe>
ORIGINAL_VISUAL_DESIGN=<unchanged_verified | unchanged_diff_only | changes_require_review>
FREE_DATA_COST=<zero mandatory cost, plus limitations>
LIVE_SOURCE_VERIFICATION=<summary, including test host>
VALIDATION=<exact outcome>
FEATURES_DONE_VERIFIED=<integer from ledger>
FEATURES_PARTIAL_OR_BLOCKED=<integer from ledger>
READY_FOR_CLAUDE_DESIGN=<YES | NO, with reasons>
NEXT_ACTION=<one precise action>
```

**`READY_FOR_CLAUDE_DESIGN=YES` requires major working sections, honest data, passing critical tests, documented routes and a stable design handoff.** Do not set it to YES based on an unfinished scaffold. Even if YES, disclose any specialized features not delivered.

---

# 15. START EXECUTING NOW — NO PLANNING-ONLY RESPONSE

Your **first actual action** should be to inspect the current repository and verify the baseline. Then create the safe branch and root handoff, and work through the milestones.

Do not spend the entire execution window writing speculative proposals. You have enough direction above to implement independently. Be decisive about architecture but conservative about data claims, visual changes, upstream request volume and deployment effects.

Treat the following as your internal work loop:

```text
READ STATE
  -> SELECT highest-value unblocked vertical slice
  -> VERIFY data availability and rights
  -> DESIGN smallest correct contract/provider
  -> IMPLEMENT backend + frontend + tests
  -> VALIDATE + INSPECT old UI impact
  -> DOCUMENT feature status and decisions
  -> CHECKPOINT commit + HANDOFF.md
  -> CONTINUE
```

Do not wait for the owner after each loop. Don't confuse autonomous execution with ignoring hard constraints. If the environment asks for permissions or imposes limits, obey them, preserve progress, and leave a clear continuation path.

## Continuation protocol for a fresh session

If you are launched into this repository and `HANDOFF.md` already documents previous Shot 1 progress:

1. Read `HANDOFF.md`, feature ledger, data-source audit, relevant ADRs and Git status.
2. Verify HEAD/branch/working tree and latest test results; do not blindly trust stale files.
3. Reconcile any uncommitted changes safely.
4. Resume at the single `NEXT_ACTION`, unless a critical regression or new blocker changes priorities.
5. Continue toward the same gates without duplicating shipped work or redesigning old pages.
6. Update `HANDOFF.md` and docs before stopping again.

**You own engineering, not art direction. Build the most complete genuine free-data NBA platform this codebase can responsibly support, without touching the existing visual design. Start now.**
