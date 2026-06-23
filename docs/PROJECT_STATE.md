# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-23_

## Current state

- **Current milestone:** Live NBA Provider Response Validation and Compatibility
- **Current task:** TASK-010 - Live NBA Provider Response Validation and Compatibility (Stages A, D, and B complete; Stage C — directory-name compatibility — active; Stage E not started)
- **Current status:** Stage A (sanitized diagnostics) and Stage D (strengthened connectivity gate), with adversarial-review hardening, merged into `main` via pull request #12 (`71b61e9`). Stage B ran one controlled, sanitized Render diagnostic and proved the cause: the live `commonallplayers` directory has a row whose `DISPLAY_LAST_COMMA_FIRST` lacks a usable comma (stage `value-format`, category `invalid-last-comma-first-name`, row index 1986), which aborts player search; the other three endpoints parse cleanly. Production was reverified fixture-backed (provider `fixture`, `/api/health` 200, fixture LeBron search 200) and the original Render start command restored. Stage C (the narrow directory-name compatibility fix) is active on branch `fix/live-nba-directory-name-compatibility`; the live provider is not fixed and live production mode is not ready. TASK-009 is completed and merged (pull request #10, `9c27e3c`); the post-merge documentation state merged through pull request #11 (`fa437d3`).
- **Current branch:** `fix/live-nba-directory-name-compatibility`

## Summary

TASK-001 through TASK-008 are completed and merged into `main`. TASK-008, the live NBA data
provider integration, used implementation commit `7f6a33d` and merged through pull request #9 in
merge commit `f8256d2`. Its earlier documentation state merged through pull request #8 in
`6b417eb`.

`NbaStatsPlayerProvider` serves live NBA.com Stats data behind the existing `PlayerProvider`
boundary and is selected through runtime configuration. Fixture mode remains the default for
tests, CI, local development, offline use, and intentionally fixture-backed demonstrations.

TASK-009 successfully deployed the application to Render at
`https://nba-performance-explorer.onrender.com`. The public health endpoint and the complete
fixture-backed user journey were smoke-tested successfully, including player search, profiles,
season statistics, game logs, career trends, and two-player comparison.

The deployment-host connectivity gate returned `PASS` for all four approved NBA.com endpoint
families at the HTTP-success and JSON-response level. Live mode was then enabled with
`NBA_DATA_PROVIDER=nba-stats`. The service started successfully, but real player search returned
`PROVIDER_INVALID_RESPONSE` with HTTP 502 because the upstream response did not satisfy the
backend's strict application-level validation.

The service was rolled back to `NBA_DATA_PROVIDER=fixture` with
`NBA_ALLOW_FIXTURE_IN_PRODUCTION=true`. The public application is currently live and healthy in
the explicitly approved fixture demonstration mode. Live NBA.com data remains disabled, and no
silent fallback or blocking-evasion mechanism was introduced.

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

TASK-010 Stage A (sanitized diagnostics) and Stage D (strengthened connectivity gate), with the
adversarial-review hardening, were merged into `main` via pull request #12 (`71b61e9`). The merged
`main` baseline is 139 frontend and 231 backend tests (370 total); formatting, ESLint, strict type
checking, the full offline suite, the production build, and `git diff --check` all pass, and the
frontend bundle is unchanged (a backend-only change). Stage C (directory-name compatibility) is in
progress on branch `fix/live-nba-directory-name-compatibility`.

The merged `main` baseline was previously verified with:

- 139 frontend tests.
- 173 backend tests.
- 312 total tests.
- Formatting, linting, strict type checking, tests, and production builds passing.
- `git diff --check` passing.
- JavaScript bundle: 714.05 KB raw and 212.81 KB gzip.
- CSS bundle: 13.47 KB raw and 3.46 KB gzip.
- The existing Vite chunk-size warning remaining known and non-blocking.

The final TASK-009 branch state was validated locally on 2026-06-22 with:

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

TASK-010 is documented in
`docs/tasks/TASK-010-live-nba-provider-response-validation.md`.

## Immediate next action

TASK-010 Stages A, D, and B are complete. Stage B proved the `commonallplayers` rejection is a
`value-format` failure (`category: invalid-last-comma-first-name`) on `DISPLAY_LAST_COMMA_FIRST` at
directory row 1986 — a string lacking the expected `"Surname, First"` comma format — which aborts
player search; the other three endpoints parse cleanly.

The active step is Stage C: implement the narrow directory-name compatibility fix in
`backend/src/features/players/nba-stats/nba-stats-mappers.ts` (the `commonallplayers` directory-name
parsing). When `DISPLAY_LAST_COMMA_FIRST` is a string without a usable comma, fall back to the
already-present `DISPLAY_FIRST_LAST` full display name as the alternate name source, keeping the
player searchable, while leaving standard `"Surname, First"` mapping, the other parsers, and provider
error semantics unchanged and still rejecting genuinely malformed rows with
`PROVIDER_INVALID_RESPONSE`. After Stage C passes full validation and review, Stage E (a controlled
live re-test from Render, then immediate rollback) requires separate explicit approval. Keep Render
tracking `main` and keep production fixture-backed throughout; live production mode is not ready.

## How to update this file

After completing a task, update the fields above, including the milestone, task, status, and
branch. Refresh the summary so it describes only verified repository and deployment state, and
set the immediate next action to the next concrete step.

Keep this file truthful. Do not describe a feature, deployment, test result, provider mode, or
connectivity result as complete unless it has actually been verified.
