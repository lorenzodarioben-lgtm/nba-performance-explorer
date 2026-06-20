# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-21_

## Current state

- **Current milestone:** Season Statistics Vertical Slice
- **Current task:** TASK-004 - Player Season Statistics
- **Current status:** Implemented and verified; pending independent review
- **Current branch:** feature/season-statistics

## Summary

TASK-001, TASK-002, and TASK-003 are all merged into `main` (TASK-003 via commit `c4c25c6`,
pull request #3 merge `dc7af98`). TASK-004 is implemented on `feature/season-statistics`
with all changes uncommitted.

On top of the player search and profile, the application now provides fixture-backed
regular-season statistics on the player profile:

- Backend endpoints `GET /api/players/:playerId/seasons` (newest-first season list, or an
  empty list for a known player with no data) and
  `GET /api/players/:playerId/seasons/:season/stats`, behind the replaceable player provider.
  Shared strict Zod contracts (`SeasonIdSchema` with consecutive-year validation,
  `PlayerSeason`, `PlayerSeasonsResponse` with enforced uniqueness and newest-first ordering,
  `PlayerSeasonStats`, `PlayerSeasonStatsResponse`) are used by both applications. The routes
  validate the player id then the season, distinguish unknown player from unknown season,
  return structured 400 (`INVALID_PLAYER_ID`/`INVALID_SEASON_ID`) and 404
  (`PLAYER_NOT_FOUND`/`SEASON_NOT_FOUND`) errors, validate outgoing payloads, and never leak
  provider-private fixture fields.
- A `PlayerSeasonStatistics` section on `/players/:playerId` with a native, labelled season
  `<select>` (newest selected by default), TanStack Query hooks (`AbortSignal`, `retry: false`,
  no placeholder data), a derived effective-season that reconciles a removed selection to the
  newest available, accessible loading/empty/unavailable-season/error states, and a semantic
  statistics description list with one-decimal per-game values and percentage formatting.

Verified on 2026-06-21 with Node.js 22.19.0 and npm 10.9.3:

- `npm run validate` passes (format check, lint, strict type check, tests, build) and
  `git diff --check` is clean.
- 100 tests pass: 52 frontend and 48 backend.
- Live manual verification (backend on `:3001`, Vite on `:5173`): newest-season default,
  newest-first options, selecting another season (including a team change), zero-valued
  statistics, a one-season player, a no-season empty state, unknown player/season and invalid
  ids through the API, preserved search/profile/health behaviour, desktop and 375px mobile
  layouts, and a clean browser console. The generic 500 and invalid-contract states are
  covered by the automated MSW tests.

## Immediate next action

Review the complete TASK-004 diff and, once approved, commit it on
`feature/season-statistics`. Do not begin charts, game logs, comparison, or any later task.

## How to update this file

After completing a task, update the fields above (milestone, task, status, branch), refresh
the summary to describe what now exists, and set the immediate next action to the following
task. Keep this honest - do not list features here that are not actually implemented.
