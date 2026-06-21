# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-21_

## Current state

- **Current milestone:** Live NBA Data Provider Integration
- **Current task:** TASK-008 - Live NBA Data Provider Integration
- **Current status:** Planning complete and provider approved with accepted risks; implementation not started
- **Current branch:** feature/live-nba-provider

## Summary

TASK-001 through TASK-007 are completed and merged into `main`. TASK-007 (two-player comparison)
used documentation commit `9be5fad` and implementation commit `6512678`, merged through pull
request #7 in merge commit `842dd31`. TASK-008 (live NBA data provider integration) is the
active milestone. Planning is complete, direct NBA.com Stats access through the existing Node.js
backend is approved as an accepted-risk product decision, and no TASK-008 application code has
started.

On top of the TASK-001 foundation, the application now provides:

- Fixture-backed player search (`GET /api/players?search=`) navigating to `/players/:playerId`.
- A fixture-backed player profile (`GET /api/players/:playerId`) with shared Zod contracts and
  accessible loading/not-found/invalid-link/error states.
- Fixture-backed regular-season statistics on the profile
  (`GET /api/players/:playerId/seasons` and `.../seasons/:season/stats`) with a native season
  selector (newest default) and selection reconciliation.
- A fixture-backed career-trends line chart (`GET /api/players/:playerId/season-trends`) of
  points, rebounds, and assists per game, with an accessible data table. Charting uses
  Recharts 3.8.1 (a frontend-only dependency, per ADR-004); adding it grew the frontend
  production bundle from ~347 KB to ~696 KB.
- A fixture-backed selected-season game log
  (`GET /api/players/:playerId/seasons/:season/games`) driven by the existing season selector,
  with shared strict contracts, newest-first games, accessible loading/empty/error states, and
  a semantic horizontally scrollable table.
- A fixture-backed two-player comparison at `/compare?player1=&player2=&season=` (TASK-007, on
  the feature branch). It composes the existing profile, available-seasons, and selected-season
  statistics endpoints (no new endpoint or contract), reuses an extracted accessible search
  combobox (`PlayerCombobox`), shares one comparison season defaulting to the newest season both
  players played, and renders all eleven `PlayerSeasonStats` fields with season-specific team
  abbreviations in a semantic table. Duplicate, invalid-id, unknown-player, no-common-season,
  no-season-data, unavailable-season, and partial-failure states are all accessible, and the
  layout has no page-level horizontal overflow at 375 px.

Runtime NBA data remains fixture-backed behind the replaceable provider boundary until TASK-008
integrates a live provider. A public production deployment remains future work.

TASK-008 will add `NbaStatsPlayerProvider`, selected explicitly with
`NBA_DATA_PROVIDER=fixture|nba-stats`. The provider will use Node.js 22 built-in `fetch` against
NBA.com's `commonallplayers`, `commonplayerinfo`, `playercareerstats`, and `playergamelog`
endpoints. Fixture mode remains the default for tests, CI, and offline demonstrations. NBA.com
person IDs remain unchanged. The plan includes local cached search, backend-private Zod
validation, bounded in-memory caching, a 10-second timeout, stable provider errors, no automatic
retries, no silent fixture fallback, and a deployment-host connectivity gate.

The project owner accepts that NBA.com Stats is undocumented and unsupported, terms may restrict
the intended public use, endpoint stability is not guaranteed, and common cloud-hosting IP ranges
may be blocked. No proxying or blocking-evasion technique is authorized. Production live mode
must not be enabled if the intended host fails the bounded connectivity gate.

The merged `main` baseline was verified on 2026-06-21 with `npm ci` and full root validation:

- Full root validation passes (format, lint, strict type-check, tests, build); `git diff --check`
  and the working tree are clean.
- 214 tests pass: 135 frontend and 79 backend.
- The frontend production bundle is 713.87 KB JavaScript (212.74 KB gzip) and 13.47 KB CSS
  (3.46 KB gzip).
- The existing Recharts/Vite chunk-size warning remains known and non-blocking.

TASK-007 is documented in `docs/tasks/TASK-007-player-comparison.md`; TASK-008 is documented in
`docs/tasks/TASK-008-live-nba-provider.md`.

## Immediate next action

Review and approve the final implementation specification in
`docs/tasks/TASK-008-live-nba-provider.md`. After approval, begin a fresh implementation session
that follows ADR-013 and the ordered TASK-008 plan without expanding scope.

## How to update this file

After completing a task, update the fields above (milestone, task, status, branch), refresh
the summary to describe what now exists, and set the immediate next action to the following
task. Keep it honest - do not list features here that are not actually implemented.
