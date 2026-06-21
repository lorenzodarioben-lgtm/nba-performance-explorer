# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-21_

## Current state

- **Current milestone:** Two-Player Comparison Slice
- **Current task:** TASK-007 - Two-Player Comparison
- **Current status:** Implemented on the feature branch; awaiting independent review (not merged)
- **Current branch:** feature/player-comparison

## Summary

TASK-001 through TASK-006 are completed and merged into `main`. TASK-006 used documentation
commit `1329ed4` and implementation commit `507be68`, merged through pull request #6 in merge
commit `1704dac`. TASK-007 (two-player comparison) is implemented on
`feature/player-comparison` and awaiting independent review; it is not committed, pushed, or
merged.

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

Runtime NBA data remains fixture-backed behind the replaceable provider boundary. A live data
provider and public deployment remain future work.

The TASK-007 feature branch was verified on 2026-06-21:

- Full root validation passes (format, lint, strict type-check, tests, build); `git diff --check`
  is clean.
- 214 tests pass: 135 frontend and 79 backend (up from 83 and 75 on the clean baseline).
- The frontend production bundle is 713.87 KB JavaScript (212.74 KB gzip) and 13.47 KB CSS
  (3.46 KB gzip).
- The existing Recharts/Vite chunk-size warning remains known and non-blocking.
- No dependency manifest or lockfile changed. Two season fixtures were added (Stephen Curry
  2017-18, Kevin Durant 2021-22 on BKN) with focused backend tests, plus `BKN` team metadata,
  to make the multi-common-season and no-common-season cases demonstrable.

TASK-007 is documented in `docs/tasks/TASK-007-player-comparison.md`.

## Immediate next action

Perform a fresh independent review of the TASK-007 changes on `feature/player-comparison`; if
approved, commit, open a pull request, and merge.

## How to update this file

After completing a task, update the fields above (milestone, task, status, branch), refresh
the summary to describe what now exists, and set the immediate next action to the following
task. Keep it honest - do not list features here that are not actually implemented.
