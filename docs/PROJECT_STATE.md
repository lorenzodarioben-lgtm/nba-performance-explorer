# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-21_

## Current state

- **Current milestone:** Selected-Season Game Log Slice
- **Current task:** TASK-006 - Player Game Log
- **Current status:** Implemented and verified; awaiting independent review
- **Current branch:** feature/player-game-log

## Summary

TASK-001 through TASK-005 are all merged into `main` (TASK-005 via commit `144a81b`, pull
request #5 merge `5ef4efa`). TASK-006 is implemented and verified on the
`feature/player-game-log` branch but has not been committed.

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

TASK-006 preserved the existing profile, search, selected-season statistics, career trends,
back navigation, and health behaviour. It introduced no dependency, live NBA API, game-detail
route, playoff data, pagination, sorting/filtering controls, or advanced metrics.

TASK-006 verification completed on 2026-06-21 with Node.js 22.19.0 and npm 10.9.3:

- Formatting, lint, strict type checking, tests, production builds, and full root validation
  pass; `git diff --check` is clean.
- 158 tests pass: 83 frontend and 75 backend.
- The frontend production bundle is 700.51 KB (209.35 KB gzip), a small increase from the
  documented ~696 KB post-chart baseline. The existing Vite large-chunk warning remains.
- The root development command starts both applications. Live browser checks verified
  multi-game, one-game, and empty-season states; season changes; player search and profile
  navigation; health; a single season selector and page-level heading; a clean browser console;
  and a 375 px viewport with no page-level horizontal overflow and local table scrolling.
- Direct API checks verified successful, empty, unknown-player, invalid-player, unknown-season,
  and invalid-season responses.
- No dependency manifest or lockfile changed.

Baseline before TASK-006 was 123 tests (64 frontend and 59 backend) on a clean working tree.
The implementation remains uncommitted for review.

## Immediate next action

Perform an independent review of the uncommitted TASK-006 changes, then commit and open a pull
request only when explicitly instructed.

## How to update this file

After completing a task, update the fields above (milestone, task, status, branch), refresh
the summary to describe what now exists, and set the immediate next action to the following
task. Keep it honest - do not list features here that are not actually implemented.
