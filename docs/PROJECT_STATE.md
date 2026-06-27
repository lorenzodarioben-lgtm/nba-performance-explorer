# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-27_

## Current State

- **Current milestone:** Portfolio Readiness
- **Current task:** TASK-011 - Stage D: Final Audit and Portfolio Assets
- **Current branch:** `chore/task-011-stage-d-finalization`
- **Current status:** TASK-011 Stages A, B, and C are merged on `main`; Stage B merged in
  PR #17 at `fc83a78`. Stage D is implemented and validated: a bounded live production
  smoke test plus a real-browser desktop/mobile screenshot pass verified the core flows,
  five live-production screenshots were added under `docs/assets/` and integrated into the
  README, portfolio materials were written in `docs/PORTFOLIO.md`, and the stale README
  test counts were corrected (147/391 to 154/398). The audit confirmed no frontend code
  defect, so no application code changed. Production remains live-backed with
  `NBA_DATA_PROVIDER=nba-stats`, `NBA_ALLOW_FIXTURE_IN_PRODUCTION=false`,
  `NBA_STATS_TIMEOUT_MS=10000`, and the normal Render start command
  `node backend/dist/server.js`; `render.yaml` and Render settings are unchanged. Final
  formal project closure is handled separately.

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
merged to `main` at `56a740e`. Stage B was merged to `main` in PR #17 at `fc83a78`; it
changed only frontend root/error-recovery code, the game-log table scroll container,
frontend tests, and task/state documentation. Stage D changed only documentation, five
screenshot assets under `docs/assets/`, and the README visual section; it did not change
frontend or backend application code, shared contracts, dependencies, provider logic,
cache behavior, diagnostics, `render.yaml`, Render settings, or production configuration.

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

Stage D audit summary:

- Verified the live production deployment through the application's own public `/api`
  routes (bounded, no direct NBA.com calls): health, player search, profile, available
  seasons, selected-season statistics, game log, career trends, and a two-player
  comparison (Stephen Curry `201939` and Kevin Durant `201142`, common season `2025-26`)
  all returned live data; direct profile and `/compare` refreshes returned the SPA shell;
  the unknown-route catch-all returned the SPA. Player ID `2544` still returned zero career
  seasons, re-confirming the documented upstream empty-data limitation (not an application
  defect).
- Captured five live-production screenshots in a real browser (home, profile, career
  trends, comparison, and a narrow mobile home) and integrated them into the README under
  `docs/assets/`.
- With a source/CSS review of every route and the 398 deterministic tests, the audit
  confirmed no page-level horizontal overflow on the captured desktop and mobile layouts,
  correct mobile single-column collapse, semantic tables with captions and scoped headers,
  the chart's equivalent table and non-colour-only series, route heading focus, the
  accessible search combobox, and the keyboard-focusable named table scroll regions. No
  frontend visual or accessibility defect was confirmed, so no application code changed;
  the only correction was the stale README test counts (147/391 to 154/398).

Stage D verification scope and honest limitations:

- Screenshots were captured at approximately `1359x904` (desktop) and `348x800` (mobile);
  the capture pipeline downscaled them from the nominal `1440x900` and ~`390px` targets,
  and the intermediate widths (`414`, `768`, `1024`) were not separately captured.
  Responsive behavior at those widths is supported by the source/CSS review and the
  desktop and mobile captures, not by per-width browser captures.
- Keyboard interaction, focus-ring visibility, and colour-contrast values are supported by
  the source review and the deterministic tests (accessible combobox keyboard handling,
  heading focus, visible focus styles, sanitized states), not by separate browser-tool
  measurements in this pass. No WCAG-compliance claim is made.

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

Stage D changed documentation, five `docs/assets/` screenshots, and the README visual
section only; no application code changed, so the test counts are unchanged. Validation on
the Stage D branch passed with:

- `npm run format` reporting no changes and `npm run validate` passing.
- Frontend tests: 154 passing.
- Backend tests: 244 passing.
- Total tests: 398 passing.
- Shared contracts, frontend, and backend production builds passing.
- The known Vite/Recharts chunk-size warning remaining non-blocking.
- `git diff --check` passing.
- The five README screenshots resolving to tracked files under `docs/assets/`.
- Automated tests remaining offline and not contacting NBA.com.

## Immediate Next Action

Merge the Stage D pull request after CI is green. Final formal project closure — an
independent end-to-end production and repository verification — is handled separately and
must not start without separate approval.

## How To Update This File

After completing a task, update the fields above, including the milestone, task, status,
and branch. Refresh the summary so it describes only verified repository and deployment
state, and set the immediate next action to the next concrete step.

Keep this file truthful. Do not describe a feature, deployment, test result, provider
mode, or connectivity result as complete unless it has actually been verified.
