# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-21_

## Current state

- **Current milestone:** Player Profile Vertical Slice
- **Current task:** TASK-003 - Player Profile Overview
- **Current status:** Implemented and verified; pending independent review
- **Current branch:** feature/player-profile

## Summary

TASK-002 (Player Search) is completed and merged into `main` (commit `0f60737`, merged
through pull request #2 in merge commit `5c3fe2e`). TASK-003 is implemented on
`feature/player-profile` with all changes uncommitted.

On top of the TASK-001 foundation and TASK-002 search, the application now provides a
fixture-backed player profile:

- A `GET /api/players/:playerId` endpoint behind the replaceable player provider. It
  validates the public id (`^[1-9]\d*$`) with a shared `PlayerIdSchema`, returns a structured
  400 for invalid ids, 404 for unknown ids, and a `PlayerProfileResponse` validated by the
  shared contract for known ids. Provider-private fixture fields (including centralised team
  metadata) are mapped to domain models and never leak.
- A real React profile page at `/players/:playerId` (replacing the placeholder). It reads
  the route id, fetches through TanStack Query with the request `AbortSignal`, runtime-
  validates the response, and renders accessible loading, success, not-found, invalid-link,
  and generic-error states with a semantic description list, formatted height/weight/draft,
  safe omission of absent optionals, route-level heading focus, and back-to-search
  navigation. Shared contracts (`PlayerProfile`, `TeamProfile`, `DraftInfo`,
  `PlayerProfileResponse`, `PlayerIdSchema`) are used by both applications.

Verified on 2026-06-21 with Node.js 22.19.0 and npm 10.9.3:

- `npm run validate` passes (format check, lint, strict type check, tests, build) and
  `git diff --check` is clean.
- 64 tests pass: 36 frontend and 28 backend.
- Live manual verification (backend on `:3001`, Vite on `:5173`): direct profile URLs and
  dev refresh, search selection into the real profile, known/complete profiles, unknown-id
  not-found, invalid-id link state, omitted optionals (including no-draft), back navigation,
  the existing health and search behaviour, and desktop and 375px mobile widths, all with a
  clean browser console. The 500 and contract-invalid states are not reproducible against the
  always-healthy fixture server and are covered by the automated MSW tests.

## Immediate next action

Review the complete TASK-003 diff and, once approved, commit it on `feature/player-profile`.
Do not begin season statistics or any later task.

## How to update this file

After completing a task, update the fields above (milestone, task, status, branch), refresh
the summary to describe what now exists, and set the immediate next action to the following
task. Keep this honest - do not list features here that are not actually implemented.
