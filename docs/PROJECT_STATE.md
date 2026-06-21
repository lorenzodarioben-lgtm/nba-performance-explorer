# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-21_

## Current state

- **Current milestone:** Selected-Season Game Log Slice
- **Current task:** TASK-006 - Player Game Log
- **Current status:** Not started
- **Current branch:** feature/player-game-log

## Summary

TASK-001 through TASK-005 are all merged into `main` (TASK-005 via commit `144a81b`, pull
request #5 merge `5ef4efa`). The `feature/player-game-log` branch is cut from that merge.

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

No game log exists yet; TASK-006 adds a selected-season game log that reuses the existing
season selector.

Baseline before TASK-006 implementation, verified on 2026-06-21 with Node.js 22.19.0 and
npm 10.9.3 on a clean `feature/player-game-log` working tree:

- `npm run validate` passes (format check, lint, strict type check, tests, build) and
  `git diff --check` is clean.
- 123 tests pass: 64 frontend and 59 backend.

## Immediate next action

Plan the implementation of TASK-006 (`docs/tasks/TASK-006-player-game-log.md`) before changing
any application code. Implementation has not started.

## How to update this file

After completing a task, update the fields above (milestone, task, status, branch), refresh
the summary to describe what now exists, and set the immediate next action to the following
task. Keep this honest - do not list features here that are not actually implemented.
