# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-26_

## Current State

- **Current milestone:** Portfolio Readiness
- **Current task:** TASK-011 - Stage A: README and Repository Presentation
- **Current branch:** `docs/task-011-stage-a-readme`
- **Current status:** TASK-011 Stage C was merged to `main` in PR #15 at
  `1aa9c2e`. Production remains live-backed with `NBA_DATA_PROVIDER=nba-stats`,
  `NBA_ALLOW_FIXTURE_IN_PRODUCTION=false`, `NBA_STATS_TIMEOUT_MS=10000`, and the
  normal Render start command `node backend/dist/server.js`. Stage C is deployed:
  the product hero, browser metadata, favicon, and provider-neutral empty states are
  live. Stage A is implemented and validated locally on branch
  `docs/task-011-stage-a-readme`: the README is rewritten for recruiter-facing project
  presentation, the Stage C merge/deployment and upstream empty-career limitation are
  documented, and the Stage D screenshot plan is recorded without creating image files.
  Stages B and D remain pending and must not be started without separate approval.

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

The same smoke check discovered a player-specific upstream empty-career response. A
bounded local diagnostic used the production NBA.com HTTP client, production timeout, and
the real career parser/mapper without editing code, changing Git, changing configuration,
or touching Render. Sanitized structural results:

- Player ID `2544`: expected `SeasonTotalsRegularSeason` result set present, 27
  headers, 0 raw rows, 0 parsed seasons.
- Player ID `201939`: expected `SeasonTotalsRegularSeason` result set present, 27
  headers, 17 raw rows, 17 parsed seasons.

Confirmed: the mapper is not filtering out player ID `2544`; the empty public seasons
result comes from a structurally valid upstream response with zero career rows. The
upstream reason remains unknown. This is now documented as an operational limitation of
the live NBA.com dependency, not a code defect. No fallback data source, proxy, retry
loop, special-case player ID, cache change, diagnostics toggle, or Render change is
authorized for this incident.

## Validation State

Before TASK-011 Stage A work began, clean `main` at
`1aa9c2ece4257701f1fd2466927051206c7fd22e` was validated with:

- Formatting check passing.
- ESLint passing.
- Strict frontend and backend TypeScript checks passing.
- 147 frontend tests passing.
- 244 backend tests passing.
- 391 total tests passing.
- Shared contracts, frontend, and backend production builds passing.
- `git diff --check` passing.

The known Vite/Recharts chunk-size warning remains non-blocking. Automated tests remain
offline and do not contact NBA.com.

After the Stage A documentation edits, the same validation gate passed again with 147
frontend tests, 244 backend tests, and 391 total tests. `git diff --check` also passed.

## Immediate Next Action

Review the Stage A branch and merge it when approved. Do not push from this session.
Stages B and D remain pending. Do not change frontend/backend application code,
dependencies, `render.yaml`, Render settings, the provider, cache behavior, diagnostics,
or production configuration as part of Stage A.

## How To Update This File

After completing a task, update the fields above, including the milestone, task, status,
and branch. Refresh the summary so it describes only verified repository and deployment
state, and set the immediate next action to the next concrete step.

Keep this file truthful. Do not describe a feature, deployment, test result, provider
mode, or connectivity result as complete unless it has actually been verified.
