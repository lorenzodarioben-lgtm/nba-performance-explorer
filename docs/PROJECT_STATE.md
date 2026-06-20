# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-21_

## Current state

- **Current milestone:** Season Statistics Vertical Slice
- **Current task:** TASK-004 - Player Season Statistics
- **Current status:** Not started
- **Current branch:** feature/season-statistics

## Summary

TASK-003 (Player Profile Overview) is completed and merged into `main` (commit `c4c25c6`,
merged through pull request #3 in merge commit `dc7af98`). The `feature/season-statistics`
branch is cut from that merge. TASK-001, TASK-002, and TASK-003 are all merged into `main`.

On top of the TASK-001 foundation, the application now provides:

- Fixture-backed player search (`GET /api/players?search=`) with an accessible combobox on
  the home page that navigates to `/players/:playerId`.
- A fixture-backed player profile (`GET /api/players/:playerId`) rendered at
  `/players/:playerId`, with shared Zod contracts (`PlayerProfile`, `TeamProfile`,
  `DraftInfo`, `PlayerProfileResponse`, `PlayerIdSchema`), structured 400/404 errors,
  provider-private fixture data mapped to domain models, and an accessible profile page with
  loading/not-found/invalid-link/error states, route-level heading focus, and back-to-search
  navigation.

Baseline before TASK-004 implementation, verified on 2026-06-21 with Node.js 22.19.0 and
npm 10.9.3 on a clean `feature/season-statistics` working tree:

- `npm run validate` passes (format check, lint, strict type check, tests, build) and
  `git diff --check` is clean.
- 64 tests pass: 36 frontend and 28 backend.

## Immediate next action

Plan the implementation of TASK-004 (`docs/tasks/TASK-004-season-statistics.md`) before
changing any application code. Implementation has not started.

## How to update this file

After completing a task, update the fields above (milestone, task, status, branch), refresh
the summary to describe what now exists, and set the immediate next action to the following
task. Keep this honest - do not list features here that are not actually implemented.
