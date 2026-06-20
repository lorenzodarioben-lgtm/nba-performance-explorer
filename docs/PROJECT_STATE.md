# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-21_

## Current state

- **Current milestone:** Career Trends Visualisation Slice
- **Current task:** TASK-005 - Player Career Trends Chart
- **Current status:** Not started
- **Current branch:** feature/career-trends-chart

## Summary

TASK-001 through TASK-004 are all merged into `main` (TASK-004 via commit `8ce4fa5`, pull
request #4 merge `1c08394`). The `feature/career-trends-chart` branch is cut from that merge.

On top of the TASK-001 foundation, the application now provides:

- Fixture-backed player search (`GET /api/players?search=`) with an accessible combobox that
  navigates to `/players/:playerId`.
- A fixture-backed player profile (`GET /api/players/:playerId`) with shared Zod contracts,
  structured 400/404 errors, and accessible loading/not-found/invalid-link/error states.
- Fixture-backed regular-season statistics on the profile:
  `GET /api/players/:playerId/seasons` and `GET /api/players/:playerId/seasons/:season/stats`,
  shared strict season contracts (`SeasonIdSchema`, `PlayerSeason`, `PlayerSeasonsResponse`,
  `PlayerSeasonStats`, `PlayerSeasonStatsResponse`), and an accessible `PlayerSeasonStatistics`
  section with a native season selector (newest default), selection reconciliation, and a
  semantic statistics list.

No charting library is installed yet; TASK-005 introduces the first charting layer (Recharts,
per ADR-004).

Baseline before TASK-005 implementation, verified on 2026-06-21 with Node.js 22.19.0 and
npm 10.9.3 on a clean `feature/career-trends-chart` working tree:

- `npm run validate` passes (format check, lint, strict type check, tests, build) and
  `git diff --check` is clean.
- 100 tests pass: 52 frontend and 48 backend.

## Immediate next action

Plan the implementation of TASK-005 (`docs/tasks/TASK-005-career-trends-chart.md`) before
changing any application code. Implementation has not started.

## How to update this file

After completing a task, update the fields above (milestone, task, status, branch), refresh
the summary to describe what now exists, and set the immediate next action to the following
task. Keep this honest - do not list features here that are not actually implemented.
