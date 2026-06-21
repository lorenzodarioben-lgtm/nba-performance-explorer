# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-21_

## Current state

- **Current milestone:** Two-Player Comparison Slice
- **Current task:** TASK-007 - Two-Player Comparison
- **Current status:** Documentation defined; implementation not started
- **Current branch:** feature/player-comparison

## Summary

TASK-001 through TASK-006 are completed and merged into `main`. TASK-006 used documentation
commit `1329ed4` and implementation commit `507be68`, merged through pull request #6 in merge
commit `1704dac`.

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

Runtime NBA data remains fixture-backed behind the replaceable provider boundary. A live data
provider and public deployment remain future work.

The clean merged baseline was re-verified on 2026-06-21 with Node.js 22.19.0 and npm 10.9.3:

- `npm ci` and full root validation pass; `git diff --check` is clean.
- 158 tests pass: 83 frontend and 75 backend.
- The frontend production bundle is 700.51 KB JavaScript (209.35 KB gzip) and 12.42 KB CSS
  (3.30 KB gzip).
- The existing Recharts/Vite chunk-size warning remains known and non-blocking.

TASK-007 is defined in `docs/tasks/TASK-007-player-comparison.md`. It adds no implementation
in this documentation turn.

## Immediate next action

Prepare a fresh implementation plan for TASK-007 before changing application code.

## How to update this file

After completing a task, update the fields above (milestone, task, status, branch), refresh
the summary to describe what now exists, and set the immediate next action to the following
task. Keep it honest - do not list features here that are not actually implemented.
