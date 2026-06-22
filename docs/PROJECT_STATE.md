# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-22_

## Current state

- **Current milestone:** Production Deployment
- **Current task:** TASK-009 - Production Deployment
- **Current status:** Documentation defined; implementation not started
- **Current branch:** feature/production-deployment

## Summary

TASK-001 through TASK-008 are completed and merged into `main`. TASK-008 (live NBA data provider
integration) used implementation commit `7f6a33d` and merged through pull request #9 in merge
commit `f8256d2` (its documentation merged earlier through pull request #8, `6b417eb`).
`NbaStatsPlayerProvider` serves live NBA.com Stats data behind the existing `PlayerProvider`
boundary, selected by configuration, with fixtures remaining the default. TASK-009 (production
deployment) is the active milestone; it is documentation-defined only and no TASK-009 deployment
work has started.

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
- A two-player comparison at `/compare?player1=&player2=&season=` (TASK-007, merged). It composes
  the existing profile, available-seasons, and selected-season
  statistics endpoints (no new endpoint or contract), reuses an extracted accessible search
  combobox (`PlayerCombobox`), shares one comparison season defaulting to the newest season both
  players played, and renders all eleven `PlayerSeasonStats` fields with season-specific team
  abbreviations in a semantic table. Duplicate, invalid-id, unknown-player, no-common-season,
  no-season-data, unavailable-season, and partial-failure states are all accessible, and the
  layout has no page-level horizontal overflow at 375 px.

Runtime NBA data is fixture-backed by default; selecting `NBA_DATA_PROVIDER=nba-stats` serves
live NBA.com Stats data through the same public contracts (TASK-008). No public production
deployment exists yet, and the deployment-host NBA.com connectivity gate that must precede
enabling live mode in production has not been run; both are the focus of TASK-009.

`NbaStatsPlayerProvider` is selected explicitly with `NBA_DATA_PROVIDER=fixture|nba-stats`. It
uses Node.js 22 built-in `fetch` against NBA.com's `commonallplayers`, `commonplayerinfo`,
`playercareerstats`, and `playergamelog` endpoints. Fixture mode remains the default for tests,
CI, and offline demonstrations, and NBA.com person IDs are unchanged. The implementation includes
local cached search, backend-private Zod validation, a bounded process-local LRU cache with
in-flight de-duplication, a configurable 10-second timeout, stable provider errors mapped to
502/503/504, zero automatic retries, and no silent fixture fallback. The deployment-host
connectivity gate is required before enabling live mode in production and was not part of the
implementation turn.

The project owner accepts that NBA.com Stats is undocumented and unsupported, terms may restrict
the intended public use, endpoint stability is not guaranteed, and common cloud-hosting IP ranges
may be blocked. No proxying or blocking-evasion technique is authorized. Production live mode
must not be enabled if the intended host fails the bounded connectivity gate.

The merged `main` baseline was verified on 2026-06-22 with `npm ci` and full root validation:

- Formatting, lint, strict type-check, tests, and production build pass; `git diff --check` is
  clean.
- 312 tests pass: 139 frontend and 173 backend. All tests are offline; none contact NBA.com.
- The frontend production bundle is 714.05 KB JavaScript (212.81 KB gzip) and 13.47 KB CSS
  (3.46 KB gzip).
- The existing Recharts/Vite chunk-size warning remains known and non-blocking.
- The one added dependency is backend `zod` (the contracts-compatible version); no other
  dependency or the lockfile structure changed.
- Independent review tightened explicit-empty configuration rejection, complete required-column
  and result-set validation, first-name/surname search mapping, hybrid position mapping,
  multi-team career validation, and invalid-career cache behavior, with focused regressions.

TASK-008 is documented in `docs/tasks/TASK-008-live-nba-provider.md`; TASK-009 is documented in
`docs/tasks/TASK-009-production-deployment.md`.

## Immediate next action

Run a fresh TASK-009 planning-only session: browse current hosting-provider documentation and
pricing, compare realistic deployment architectures, assess NBA.com cloud-connectivity risk, and
resolve the deferred questions in `docs/tasks/TASK-009-production-deployment.md` before any
deployment or configuration change. Before enabling `NBA_DATA_PROVIDER=nba-stats` on a deployed
host, the deployment-host connectivity gate against the four NBA.com endpoints (ADR-013) must
pass; a failed gate stops production live mode.

## How to update this file

After completing a task, update the fields above (milestone, task, status, branch), refresh
the summary to describe what now exists, and set the immediate next action to the following
task. Keep it honest - do not list features here that are not actually implemented.
