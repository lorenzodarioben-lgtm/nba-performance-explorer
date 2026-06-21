# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-21_

## Current state

- **Current milestone:** Career Trends Visualisation Slice
- **Current task:** TASK-005 - Player Career Trends Chart
- **Current status:** Implemented and verified; pending independent review
- **Current branch:** feature/career-trends-chart

## Summary

TASK-001 through TASK-004 are all merged into `main` (TASK-004 via commit `8ce4fa5`, pull
request #4 merge `1c08394`). TASK-005 is implemented on `feature/career-trends-chart` with all
changes uncommitted.

On top of player search, profile, and season statistics, the application now provides a
fixture-backed career-trends visualisation on the player profile:

- Backend endpoint `GET /api/players/:playerId/season-trends` behind the replaceable player
  provider, returning all of a player's regular-season statistics strictly oldest-first (or an
  empty array for a known player with no data). The shared strict `PlayerSeasonTrendsResponse`
  contract reuses `PlayerSeasonStats` and enforces unique, oldest-first ordering; the route
  returns structured 400 (`INVALID_PLAYER_ID`) and 404 (`PLAYER_NOT_FOUND`) errors, validates
  outgoing payloads, and never leaks provider-private fields.
- A `PlayerCareerTrends` section on `/players/:playerId` (below the season statistics) that
  fetches through TanStack Query and renders a responsive Recharts line chart of points,
  rebounds, and assists per game alongside an always-visible accessible data table built from
  the same transformed rows. Series are distinguished by line pattern (solid/dashed/dotted),
  legend marker shape, and label — not colour alone. Chart animation is disabled. Distinct
  accessible states cover loading, no seasons, a single season (insufficient-data message plus
  the table), two-or-more seasons, and errors. Recharts 3.8.1 is a frontend-only dependency
  (per ADR-004).

Verified on 2026-06-21 with Node.js 22.19.0 and npm 10.9.3:

- `npm run validate` passes (format check, lint, strict type check, tests, build) and
  `git diff --check` is clean.
- 123 tests pass: 64 frontend and 59 backend.
- The frontend production bundle grew from ~347 KB to ~696 KB with Recharts.
- Live manual verification (backend on `:3001`, Vite on `:5173`): the multi-season chart and
  accessible table (oldest-first, matching one-decimal values, distinct line patterns, legend),
  the one-season insufficient-data state, the no-season empty state, unknown/invalid ids through
  the API, preserved search/profile/season-statistics/health behaviour, desktop and 375px mobile
  layouts (responsive chart, no horizontal overflow), and a clean browser console. The generic
  500 and invalid-contract states are covered by the automated MSW tests.

## Immediate next action

Review the complete TASK-005 diff and, once approved, commit it on
`feature/career-trends-chart`. Do not begin game logs, comparison, calculated insights, or any
later task.

## How to update this file

After completing a task, update the fields above (milestone, task, status, branch), refresh
the summary to describe what now exists, and set the immediate next action to the following
task. Keep this honest - do not list features here that are not actually implemented.
