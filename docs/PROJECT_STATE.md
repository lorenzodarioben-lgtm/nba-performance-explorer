# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-21_

## Current state

- **Current milestone:** Live NBA Data Provider Integration
- **Current task:** TASK-008 - Live NBA Data Provider Integration
- **Current status:** Documentation defined; implementation not started
- **Current branch:** feature/live-nba-provider

## Summary

TASK-001 through TASK-007 are completed and merged into `main`. TASK-007 (two-player comparison)
used documentation commit `9be5fad` and implementation commit `6512678`, merged through pull
request #7 in merge commit `842dd31`. TASK-008 (live NBA data provider integration) is the
active milestone; it is documentation-defined only and no TASK-008 application code has started.

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

Run a fresh TASK-008 planning-only session: browse and compare current live NBA API providers
and resolve the deferred provider-selection questions in
`docs/tasks/TASK-008-live-nba-provider.md` before writing any application code.

## How to update this file

After completing a task, update the fields above (milestone, task, status, branch), refresh
the summary to describe what now exists, and set the immediate next action to the following
task. Keep it honest - do not list features here that are not actually implemented.
