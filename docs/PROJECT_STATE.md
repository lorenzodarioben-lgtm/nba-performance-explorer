# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-23_

## Current state

- **Current milestone:** Live NBA Provider Response Validation and Compatibility
- **Current task:** TASK-010 - Live NBA Provider Response Validation and Compatibility (Stage A and Stage D implemented; Stage B pending explicit authorization; Stage C blocked on evidence; Stage E not started)
- **Current status:** Sanitized response diagnostics (Stage A) and the strengthened deployment-host connectivity gate (Stage D) are implemented and verified offline on branch `fix/live-nba-provider-response-validation`. No root cause has been claimed — the legitimate live `commonallplayers` response variation is still unproven and awaits a Stage B sanitized Render diagnostic run. Production remains live from `main` in the verified fixture-backed mode; the live provider is not fixed and live production mode is not ready. TASK-009 is completed and merged (pull request #10, `9c27e3c`); the post-merge documentation state merged through pull request #11 (`fa437d3`).
- **Current branch:** `fix/live-nba-provider-response-validation`

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

The TASK-010 branch `fix/live-nba-provider-response-validation` (Stage A and Stage D) was validated
locally on 2026-06-23 with formatting, ESLint, strict type checking, the full offline test suite,
and the production build all passing, and `git diff --check` clean. The suite is now 139 frontend
and 217 backend tests (356 total) — 31 new backend tests for the diagnostics flag, sanitized
diagnostic content and stages, the sentinel-secret sanitation sweep, public-error invariance, the
reporter wiring, and the strengthened gate. The frontend bundle is unchanged (a backend-only
change). This branch is not yet merged into `main`.

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

TASK-010 Stage A (sanitized, off-by-default response diagnostics) and Stage D (a strengthened
deployment-host gate that runs the same production parser/mapper per endpoint) are implemented and
verified offline on branch `fix/live-nba-provider-response-validation`. The confirmed architecture
gap — the old gate validated only HTTP 2xx plus parseable JSON, whereas player search additionally
runs the strict `parseDirectory` / `selectResultSet` path over the `commonallplayers` response — is
now closed in the gate. The exact legitimate response variation remains unproven and must not be
assumed.

The next steps are: (1) review the diagnostics and strengthened gate; then (2) perform one
explicitly authorized, sanitized Stage B Render diagnostic run — execute the strengthened gate from
the Render host (`node backend/dist/scripts/nba-connectivity-gate.js`) and record only the
sanitized `commonallplayers` diagnostic (failing stage, category, and structural fields), no raw
bodies. Stage C (the narrow parser/mapper compatibility fix) stays blocked until that evidence
proves the variation, and Stage E (controlled live re-test) requires separate approval. Keep Render
tracking `main` and keep production in the verified fixture-backed mode throughout; no root cause
has been claimed and live production mode is not ready.

## How to update this file

After completing a task, update the fields above, including the milestone, task, status, and
branch. Refresh the summary so it describes only verified repository and deployment state, and
set the immediate next action to the next concrete step.

Keep this file truthful. Do not describe a feature, deployment, test result, provider mode, or
connectivity result as complete unless it has actually been verified.
