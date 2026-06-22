# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-22_

## Current state

- **Current milestone:** Live NBA Data Provider Integration
- **Current task:** TASK-008 - Live NBA Data Provider Integration
- **Current status:** Implemented and independently reviewed; pending pull request and merge
- **Current branch:** feature/live-nba-provider

## Summary

TASK-001 through TASK-007 are completed and merged into `main`. TASK-007 (two-player comparison)
used documentation commit `9be5fad` and implementation commit `6512678`, merged through pull
request #7 in merge commit `842dd31`. TASK-008 (live NBA data provider integration) is the
active milestone. It is implemented and independently reviewed on
`feature/live-nba-provider` (pending pull request and merge; not yet merged into `main`):
`NbaStatsPlayerProvider` serves live NBA.com Stats data behind the existing `PlayerProvider`
boundary, selected by configuration, with fixtures remaining the default.

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
- A two-player comparison at `/compare?player1=&player2=&season=` (TASK-007, merged). It composes
  the existing profile, available-seasons, and selected-season
  statistics endpoints (no new endpoint or contract), reuses an extracted accessible search
  combobox (`PlayerCombobox`), shares one comparison season defaulting to the newest season both
  players played, and renders all eleven `PlayerSeasonStats` fields with season-specific team
  abbreviations in a semantic table. Duplicate, invalid-id, unknown-player, no-common-season,
  no-season-data, unavailable-season, and partial-failure states are all accessible, and the
  layout has no page-level horizontal overflow at 375 px.

Runtime NBA data is fixture-backed by default; selecting `NBA_DATA_PROVIDER=nba-stats` serves
live NBA.com Stats data through the same public contracts (TASK-008). A public production
deployment — and the deployment-host connectivity gate that must precede enabling live mode in
production — remain future work.

`NbaStatsPlayerProvider` is selected explicitly with `NBA_DATA_PROVIDER=fixture|nba-stats`. It
uses Node.js 22 built-in `fetch` against NBA.com's `commonallplayers`, `commonplayerinfo`,
`playercareerstats`, and `playergamelog` endpoints. Fixture mode remains the default for tests,
CI, and offline demonstrations, and NBA.com person IDs are unchanged. The implementation includes
local cached search, backend-private Zod validation, a bounded process-local LRU cache with
in-flight de-duplication, a configurable 10-second timeout, stable provider errors mapped to
502/503/504, zero automatic retries, and no silent fixture fallback. The deployment-host
connectivity gate is required before enabling live mode in production and was not part of the
implementation turn.

The project owner accepts that NBA.com Stats is undocumented and unsupported, terms may restrict
the intended public use, endpoint stability is not guaranteed, and common cloud-hosting IP ranges
may be blocked. No proxying or blocking-evasion technique is authorized. Production live mode
must not be enabled if the intended host fails the bounded connectivity gate.

The TASK-008 feature branch was verified on 2026-06-22 with full root validation:

- Formatting, lint, strict type-check, tests, and production build pass; `git diff --check` is
  clean.
- 312 tests pass: 139 frontend and 173 backend. All tests are offline; none contact NBA.com.
- The frontend production bundle is 714.05 KB JavaScript (212.81 KB gzip) and 13.47 KB CSS
  (3.46 KB gzip).
- The existing Recharts/Vite chunk-size warning remains known and non-blocking.
- The one added dependency is backend `zod` (the contracts-compatible version); no other
  dependency or the lockfile structure changed.
- Independent review tightened explicit-empty configuration rejection, complete required-column
  and result-set validation, first-name/surname search mapping, hybrid position mapping,
  multi-team career validation, and invalid-career cache behavior, with focused regressions.

TASK-007 is documented in `docs/tasks/TASK-007-player-comparison.md`; TASK-008 is documented in
`docs/tasks/TASK-008-live-nba-provider.md`.

## Immediate next action

Create and review the TASK-008 pull request, then merge only when explicitly authorized. Before
enabling `NBA_DATA_PROVIDER=nba-stats` in any deployed environment, run the deployment-host
connectivity gate against the four NBA.com endpoints (ADR-013); a failed gate stops production
live mode.

## How to update this file

After completing a task, update the fields above (milestone, task, status, branch), refresh
the summary to describe what now exists, and set the immediate next action to the following
task. Keep it honest - do not list features here that are not actually implemented.
