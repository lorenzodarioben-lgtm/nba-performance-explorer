# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-22_

## Current state

- **Current milestone:** Production Deployment
- **Current task:** TASK-009 - Production Deployment
- **Current status:** Render compatibility fix implemented and validated locally; uncommitted and awaiting redeployment
- **Current branch:** `feature/production-deployment`

## Summary

TASK-001 through TASK-008 are completed and merged into `main`. TASK-008, the live NBA data
provider integration, used implementation commit `7f6a33d` and merged through pull request #9 in
merge commit `f8256d2`. Its earlier documentation state merged through pull request #8 in
`6b417eb`.

`NbaStatsPlayerProvider` serves live NBA.com Stats data behind the existing `PlayerProvider`
boundary and is selected through runtime configuration. Fixture mode remains the default for
tests, CI, local development, offline use, and intentionally fixture-backed demonstrations.

TASK-009, production deployment, is the active milestone. The branch includes:

- A Render Blueprint in `render.yaml`.
- One Render web service running the Express backend.
- Same-origin serving of the built React frontend and all `/api` routes.
- Environment-gated static frontend serving through `FRONTEND_DIST`.
- A deployment-host NBA.com connectivity-gate script.
- Offline tests for production static serving and the connectivity gate.
- Production documentation, smoke-test procedures, rollback instructions, and known limitations.

The first Render build completed successfully, but the service failed during startup. Render runs
the service with `NODE_ENV=production`, while the original provider configuration deliberately
rejected `NBA_DATA_PROVIDER=fixture` in production. The previous documentation and Blueprint
incorrectly assumed that leaving `NODE_ENV` unset in `render.yaml` would prevent production mode.

A compatibility fix is now implemented locally:

- `NBA_ALLOW_FIXTURE_IN_PRODUCTION=true|false` was added as a strict explicit safety switch.
- Production still requires an explicit `NBA_DATA_PROVIDER`.
- Production fixture mode remains rejected unless
  `NBA_ALLOW_FIXTURE_IN_PRODUCTION=true` is supplied exactly.
- An absent production provider remains a startup error even when the fixture allowance is enabled.
- Invalid allowance values fail configuration before the server listens.
- Live `nba-stats` mode is unchanged.
- A configured live provider never silently falls back to fixtures.
- `render.yaml` now explicitly selects fixture mode and explicitly approves that temporary
  production fixture demonstration.
- `backend/.env.example`, the README, and the relevant task and architecture documentation are
  being updated to describe the real Render behavior.

No successful public deployment exists yet. The compatibility fix has not yet been committed,
pushed, or redeployed. Deployment-host NBA.com connectivity remains unverified.

On top of the TASK-001 foundation, the application provides:

- Fixture-backed player search through `GET /api/players?search=`, navigating to
  `/players/:playerId`.
- A player profile through `GET /api/players/:playerId`, with shared Zod contracts and accessible
  loading, not-found, invalid-link, and error states.
- Regular-season statistics through `GET /api/players/:playerId/seasons` and
  `GET /api/players/:playerId/seasons/:season/stats`, with a native season selector, newest-season
  defaulting, and selection reconciliation.
- A career-trends line chart through `GET /api/players/:playerId/season-trends`, displaying
  points, rebounds, and assists per game with an accessible data table.
- A selected-season game log through
  `GET /api/players/:playerId/seasons/:season/games`, driven by the existing season selector and
  displayed in a semantic horizontally scrollable table.
- A two-player comparison at `/compare?player1=&player2=&season=`. It composes the existing
  profile, available-seasons, and selected-season statistics endpoints without adding a new
  comparison endpoint or contract.
- An extracted accessible `PlayerCombobox`.
- A shared comparison season defaulting to the newest season played by both selected players.
- A semantic comparison table displaying all eleven `PlayerSeasonStats` fields and
  season-specific team abbreviations.
- Accessible handling of duplicate selections, invalid IDs, unknown players, no common season,
  no season data, unavailable seasons, and partial request failures.
- Responsive layouts without page-level horizontal overflow at approximately 375 px.

Runtime NBA data is fixture-backed by default. Selecting
`NBA_DATA_PROVIDER=nba-stats` serves live NBA.com Stats data through the same public contracts.

`NbaStatsPlayerProvider` uses Node.js 22 built-in `fetch` with the approved NBA.com endpoint
families:

- `commonallplayers`
- `commonplayerinfo`
- `playercareerstats`
- `playergamelog`

The live-provider implementation includes:

- Local cached player search.
- Backend-private Zod response validation.
- A bounded process-local LRU cache.
- In-flight request de-duplication.
- A configurable timeout defaulting to 10 seconds.
- Stable provider errors mapped to HTTP 502, 503, and 504 responses.
- Zero automatic retries.
- No silent fixture fallback.
- Unchanged NBA.com person IDs.
- No API key requirement.
- No proxying, IP rotation, cookie harvesting, CAPTCHA bypass, WAF bypass, or other
  blocking-evasion behavior.

The project owner accepts that NBA.com Stats is undocumented and unsupported, that endpoint
stability is not guaranteed, that terms may restrict the intended public use, and that shared
cloud-hosting IP ranges may be blocked. Live production mode must not be enabled when the intended
deployment host fails the bounded connectivity gate.

## Validation state

The merged `main` baseline was previously verified with:

- 139 frontend tests.
- 173 backend tests.
- 312 total tests.
- Formatting, linting, strict type checking, tests, and production builds passing.
- `git diff --check` passing.
- JavaScript bundle: 714.05 KB raw and 212.81 KB gzip.
- CSS bundle: 13.47 KB raw and 3.46 KB gzip.
- The existing Vite chunk-size warning remaining known and non-blocking.

The current uncommitted Render compatibility fix was validated locally on 2026-06-22 with:

- Formatting check passed.
- ESLint passed.
- Strict frontend and backend TypeScript checks passed.
- 139 frontend tests passed.
- 186 backend tests passed.
- 325 total tests passed.
- Shared contracts build passed.
- Frontend production build passed.
- Backend production build passed.
- `git diff --check` passed.
- JavaScript bundle remained 714.05 KB raw and 212.81 KB gzip.
- CSS bundle remained 13.47 KB raw and 3.46 KB gzip.
- The existing Vite chunk-size warning remained known and non-blocking.
- No automated test contacted NBA.com.

The four additional provider-configuration tests introduced by the compatibility fix verify:

- Explicitly approved fixture mode succeeds in production.
- Fixture mode remains rejected in production when the allowance is absent or false.
- An absent production provider remains rejected even when the allowance is true.
- Invalid fixture-allowance values are rejected.

TASK-008 is documented in
`docs/tasks/TASK-008-live-nba-provider.md`.

TASK-009 is documented in
`docs/tasks/TASK-009-production-deployment.md`.

## Immediate next action

Finish updating the TASK-008 and TASK-009 documentation so it no longer claims that Render can
leave `NODE_ENV` unset.

Then:

1. Run the full root validation again.
2. Run `git diff --check`.
3. Review the complete diff and confirm that only the intended TASK-009 compatibility and
   documentation changes exist.
4. Commit the compatibility fix on `feature/production-deployment`.
5. Push the branch to update pull request #10.
6. Allow Render to redeploy automatically, or manually deploy the latest commit if necessary.
7. Confirm that the service reaches the `Live` state.
8. Smoke-test the public homepage.
9. Smoke-test `GET /api/health`.
10. Verify that fixture-backed player search, profiles, statistics, trends, game logs, and
    comparison work through the public URL.
11. Run the ADR-013 NBA.com connectivity gate from the deployed host.
12. Enable `NBA_DATA_PROVIDER=nba-stats` and remove or disable
    `NBA_ALLOW_FIXTURE_IN_PRODUCTION` only when all four endpoint checks pass.
13. If any endpoint check fails, retain the explicitly approved fixture demonstration and document
    the limitation without introducing blocking-evasion behavior.
14. Merge pull request #10 only after the deployment and smoke-test evidence has been recorded.

## How to update this file

After completing a task, update the fields above, including the milestone, task, status, and
branch. Refresh the summary so it describes only verified repository and deployment state, and
set the immediate next action to the next concrete step.

Keep this file truthful. Do not describe a feature, deployment, test result, provider mode, or
connectivity result as complete unless it has actually been verified.
