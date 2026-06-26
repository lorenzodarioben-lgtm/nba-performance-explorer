# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-26_

## Current State

- **Current milestone:** Portfolio Readiness
- **Current task:** TASK-011 - Stage B: Accessibility and Responsive Polish
- **Current branch:** `fix/task-011-stage-b-accessibility-responsive`
- **Current status:** TASK-011 Stage A is merged on `main` at `56a740e`, and Stage C is
  already deployed. Stage B is implemented and validated locally on this branch: a
  top-level React error boundary was added, the frontend accessibility/responsive source
  audit was completed, the confirmed game-log scroll-region accessibility issue was fixed,
  and deterministic tests were added. Production remains live-backed with
  `NBA_DATA_PROVIDER=nba-stats`, `NBA_ALLOW_FIXTURE_IN_PRODUCTION=false`,
  `NBA_STATS_TIMEOUT_MS=10000`, and the normal Render start command
  `node backend/dist/server.js`. Render and `render.yaml` were untouched. Stage D remains
  pending, and TASK-011 is not complete.

## Summary

TASK-001 through TASK-010 are complete and merged. The application is deployed at
`https://nba-performance-explorer.onrender.com` as a single Render web service: Express
serves the built React SPA and the `/api` routes from one origin.

The product supports the core journey end to end:

- Search NBA players.
- Open a player profile.
- View available seasons and selected-season statistics.
- Explore career trends through an accessible chart with an equivalent semantic table.
- View selected-season game logs.
- Compare two players through shareable URLs.

The backend uses a replaceable `PlayerProvider` boundary. The live provider uses the
approved NBA.com Stats endpoint families (`commonallplayers`, `commonplayerinfo`,
`playercareerstats`, and `playergamelog`) through a backend-only HTTP client, strict
response parsing, shared public contracts, process-local caching, sanitized provider
errors, zero automatic retries, and no silent fixture fallback. Fixture mode remains the
default for local development, tests, CI, offline use, and explicitly approved rollback
demonstrations.

TASK-011 Stage C changed only frontend UX, browser metadata, tests, and task
documentation. It did not change backend code, shared contracts, dependencies,
`render.yaml`, or Render settings. The deployed Stage C production smoke check confirmed
that the homepage and a player profile route load in production.

TASK-011 Stage A rewrote the public README for recruiter-facing presentation and was
merged to `main` at `56a740e`. Stage B changed only frontend root/error-recovery code,
the game-log table scroll container, frontend tests, and task/state documentation. It did
not change backend code, shared contracts, dependencies, provider logic, cache behavior,
diagnostics, `render.yaml`, Render settings, README structure, or production
configuration.

Stage B audit summary:

- Preserved existing accessible player combobox behavior, route-heading focus, sanitized
  loading/error states, native season selectors, semantic game-log and comparison tables,
  career chart table equivalence, and non-colour-only chart series patterns.
- Added a top-level React error boundary around the app root so unexpected render-time
  errors below the root show a concise recovery screen instead of a blank page.
- Fixed the confirmed game-log scroll-region issue by giving the horizontally scrollable
  table container an accessible group name, keyboard focus, and visible focus styling.
- Attempted browser viewport tooling, but it did not initialize before navigation. Stage B
  therefore used static source/CSS inspection plus deterministic tests; visual viewport,
  keyboard, and contrast checks remain Stage D manual work.

The same Stage C smoke check discovered a player-specific upstream empty-career response.
A bounded local diagnostic used the production NBA.com HTTP client, production timeout,
and the real career parser/mapper without editing code, changing Git, changing
configuration, or touching Render. Sanitized structural results:

- Player ID `2544`: expected `SeasonTotalsRegularSeason` result set present, 27 headers,
  0 raw rows, 0 parsed seasons.
- Player ID `201939`: expected `SeasonTotalsRegularSeason` result set present, 27
  headers, 17 raw rows, 17 parsed seasons.

Confirmed: the mapper is not filtering out player ID `2544`; the empty public seasons
result comes from a structurally valid upstream response with zero career rows. The
upstream reason remains unknown. This is documented as an operational limitation of the
live NBA.com dependency, not a code defect. No fallback data source, proxy, retry loop,
special-case player ID, cache change, diagnostics toggle, or Render change is authorized
for this incident.

## Validation State

Before TASK-011 Stage B work began, clean `main` at
`56a740ee62a5a8f93e03f00b32f869a83cff913b` was validated with:

- `npm run validate` passing.
- Frontend tests: 147.
- Backend tests: 244.
- Total tests: 391.
- `git diff --check` passing.
- Shared contracts, frontend, and backend production builds passing.
- The known Vite/Recharts chunk-size warning remaining non-blocking.
- Automated tests remaining offline and not contacting NBA.com.

After the Stage B implementation, validation passed locally with:

- Focused frontend tests for `AppErrorBoundary` and `PlayerGameLog`: 19 passing.
- Full frontend tests: 154 passing.
- Backend tests: 244 passing.
- Total tests: 398 passing.
- `npm run validate` passing.
- Shared contracts, frontend, and backend production builds passing.
- The known Vite/Recharts chunk-size warning remaining non-blocking.
- Automated tests remaining offline and not contacting NBA.com.

## Immediate Next Action

Review the local Stage B commits and push or open a pull request only with explicit
approval. Stage D remains pending and must not start without separate approval.

## How To Update This File

After completing a task, update the fields above, including the milestone, task, status,
and branch. Refresh the summary so it describes only verified repository and deployment
state, and set the immediate next action to the next concrete step.

Keep this file truthful. Do not describe a feature, deployment, test result, provider
mode, or connectivity result as complete unless it has actually been verified.
