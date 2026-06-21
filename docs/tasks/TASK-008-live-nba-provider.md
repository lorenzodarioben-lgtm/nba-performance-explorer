# TASK-008 — Live NBA Data Provider Integration

- **Milestone:** Live NBA Data Provider Integration
- **Status:** Documentation-defined; implementation not started
- **Branch:** `feature/live-nba-provider`

> Read `AGENTS.md`, `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`,
> and `docs/DECISIONS.md` before starting. TASK-001 through TASK-007 are completed and merged.
> Stay strictly within this task and preserve search, profile, season-statistics, career-trends,
> game-log, two-player-comparison, and health behaviour. This document defines scope only; it
> selects no provider and writes no application code. A separate planning-only turn must resolve
> the deferred questions before any implementation.

## Status

TASK-008 is documentation-defined. No application code, dependency, manifest, lockfile,
environment file, or provider selection has been made. The next turn is a planning-only turn
that must browse current provider documentation and compare realistic options.

## Objective

Replace the fixture-backed runtime NBA data with a real external NBA data source **while
preserving** the existing frontend, shared contracts, Express routes, provider boundary, error
behaviour, accessibility, and test reliability. The change is a provider-integration vertical
slice behind the established `PlayerProvider` interface (ADR-002): the fixture provider remains
for tests and controlled development, and a new live provider is selected through backend
configuration. No frontend feature is redesigned and no public domain contract is widened
unless the planning turn proves it is unavoidable.

## User Value

A user sees current, real NBA players, profiles, seasons, statistics, career trends, game logs,
and two-player comparisons instead of illustrative fixtures, with the same accessible loading,
empty, invalid, unavailable, and error states. The application continues to work deterministically
in development and CI (against fixtures) and degrades gracefully when the upstream service is rate
limited, slow, failing, or misconfigured.

## Verified Starting State

- TASK-001 through TASK-007 are completed and merged into `main`.
- TASK-007 documentation commit: `9be5fad`; implementation commit: `6512678`; pull request: #7;
  merge commit: `842dd31`.
- The merged baseline passes 135 frontend tests and 79 backend tests (214 total).
- The production bundle is 713.87 KB JavaScript (212.74 KB gzip) and 13.47 KB CSS (3.46 KB gzip).
- The existing Vite chunk-size warning is known and non-blocking.
- Runtime data is fixture-backed behind the `PlayerProvider` interface; the backend exposes
  player search, player profiles, available seasons, selected-season statistics, season trends,
  and selected-season game logs. The frontend talks only to this repository's backend.
- No live NBA API, deployment, authentication, persistence store, or secret currently exists in
  the repository.

## In Scope

- Research and select an appropriate live NBA API (decided in the planning turn, not here).
- Implement a live provider **behind the existing `PlayerProvider` interface**.
- Keep the existing fixture provider for automated tests and controlled local development.
- Select the active provider through **backend configuration** (an environment variable or
  equivalent; exact name decided in planning).
- Store API keys only in backend environment variables; never expose provider credentials to the
  frontend, the bundle, logs, errors, tests, or Git.
- Normalize external responses into the existing public domain contracts (map provider-private
  shapes to the shared models before they leave the backend).
- Preserve the current frontend routes, query hooks, and query keys without behavioural change.
- Preserve player search, player profiles, available seasons, selected-season statistics, career
  trends, game logs, and two-player comparison.
- Add request timeouts.
- Add rate-limit handling.
- Add upstream-error handling.
- Add malformed-response handling.
- Add caching where appropriate.
- Add deterministic, structured backend errors (reuse the existing error contract and codes).
- Add logging that never exposes credentials or sensitive headers.
- Document local configuration in `backend/.env.example` (variable names only, no real values).
- Ensure the application still starts safely when live-provider configuration is missing.
- Define whether fixture fallback is permitted and in which environments (planning decision).
- Add provider contract tests.
- Add mocked upstream HTTP tests.
- Keep CI independent from the real external service (no real key, no network dependency).
- Perform limited manual verification against the real API, outside the automated tests.

## Out of Scope (Explicit Exclusions)

- Frontend redesign.
- Authentication or user accounts.
- Favourites.
- Predictions.
- Rankings.
- Advanced metrics.
- Play-by-play.
- Shot charts.
- Database persistence, unless required solely for approved caching.
- Public deployment.
- A mobile application.
- A new frontend state library.
- Replacing TanStack Query.
- Removing the fixture-based automated tests.
- Automated tests that call the real external API.
- Committing API keys or real `.env` files.

## Architecture Requirements

These follow ARCHITECTURE.md and ADR-002/ADR-003/ADR-005 and must not be violated:

- Preserve `PlayerProvider` as the backend data-source boundary. The live provider is one more
  implementation of that interface, selected by configuration (ADR-002, ADR-005).
- Routes must not call the external NBA API directly; they call the provider interface.
- Frontend components must not call the external provider directly; the frontend talks only to
  this repository's backend.
- External provider response types must remain **private to the backend** (provider layer), never
  imported by the frontend and never returned raw.
- Mappers must return the existing public domain models; provider-private fields must not leak.
- Outgoing API responses must still be validated with the shared Zod schemas before sending.
- Provider errors must be converted into the stable internal structured-error behaviour (existing
  `ApiErrorResponse` shape and codes); raw upstream messages, bodies, and stack traces are never
  forwarded to clients.
- Secrets must never appear in frontend bundles, logs, errors, tests, or Git (ADR-003).
- Automated tests must mock the upstream provider; CI must run without a live API key or network
  dependency.

## Provider Boundary And Configuration

- The provider is chosen at startup by configuration. When the live provider is selected and its
  required configuration (for example an API key) is present, the backend uses it; the exact
  selection mechanism, variable names, and the missing-configuration behaviour are planning
  decisions (see "Deferred Planning Questions").
- The fixture provider remains the default for tests and for development without a key; the app
  must start safely (not crash) when live configuration is absent — the planning turn decides
  whether that means falling back to fixtures, starting in a clearly-degraded state, or refusing
  to enable the live provider while leaving the rest of the app working.
- Cross-cutting upstream concerns (timeouts, retries, rate-limit handling, caching, error
  normalization, safe logging) belong in the backend provider/transport layer, not in routes and
  not in the frontend.

## Shared Contracts

- Reuse the existing public contracts (`PlayerSummary`, `PlayerProfile`, `PlayerSeason`,
  `PlayerSeasonStats`, season-trends, game-log, and the structured error contract). Do not widen
  or duplicate them.
- Any contract change must be proven necessary by the planning turn, kept minimal and
  backward-compatible, `.strict()`, exported with its inferred type, and recorded as an ADR. The
  default expectation is **no contract change**.
- Public IDs remain strings. If provider IDs differ from the current public IDs, the mapping is a
  backend concern decided in planning (see deferred questions); provider IDs must not leak.

## Testing Requirements

Use the existing Vitest, React Testing Library, jest-dom, jsdom, MSW, and Supertest setup. Do not
add a testing framework.

- **Provider contract tests:** assert the live provider maps representative upstream payloads into
  the shared domain models, rejects/normalizes malformed payloads, and never returns
  provider-private fields. Upstream HTTP is mocked (no real network).
- **Mocked upstream HTTP tests:** cover success, timeout, rate-limit, upstream 5xx, and
  malformed-body paths, asserting the backend produces the correct structured internal errors and
  status codes and that secrets/headers never appear in responses or logs.
- **Route/regression tests:** the existing search, profile, season-list, selected-season-stats,
  trends, game-log, comparison, health, route-ordering, and method-not-allowed tests continue to
  pass with the fixture provider selected.
- **Frontend tests** remain provider-agnostic (they exercise the backend contract via MSW) and
  must continue to pass unchanged.
- CI must pass with no live API key and no external network access. No automated test may call the
  real external API.

## Manual Verification (outside automated tests)

- With the live provider configured locally (real key in a git-ignored `.env`), start the app and
  confirm: search returns current live players; a profile, available seasons, selected-season
  statistics, career trends, and a game log load with normalized live data; two-player comparison
  works without frontend changes beyond any necessary compatibility fix.
- Confirm graceful behaviour for at least one induced failure (for example an invalid key, a
  forced timeout, or a rate-limit response) — the user sees a controlled accessible state, not raw
  upstream text.
- Confirm the browser never receives the API key (inspect the bundle and network traffic) and that
  backend logs do not contain credentials or sensitive headers.
- Confirm the app still starts with the live configuration absent (per the chosen
  missing-configuration policy).
- Stop development processes and confirm project ports are free.

## Security And Repository Hygiene

- Backend-only credentials via environment variables; a committed `backend/.env.example` documents
  variable names with **no real values**; real `.env` files stay git-ignored (ADR-003).
- No credentials, tokens, or secrets in frontend code, the bundle, logs, errors, tests, fixtures,
  or any committed file.
- No provider-private response shapes in public responses or React components.
- No raw upstream error messages or stack traces rendered to users.
- No generated output, coverage, preview configuration, dependency directory, or real environment
  file tracked.
- Review the complete Git diff and run `git diff --check`.

## Deferred Planning Questions

The planning-only turn must browse current provider documentation and resolve these before any
implementation. They are intentionally **not** answered here.

- Exact NBA API/provider choice.
- Provider pricing and free-tier limits.
- Authentication method.
- Request quota.
- Data coverage and historical limits.
- Whether all existing endpoints are supported by the provider.
- Mapping differences between provider IDs and current public IDs.
- Cache technology and cache duration.
- Retry policy.
- Timeout duration.
- Concurrency limits.
- Fixture fallback policy (whether permitted, and in which environments).
- Environment-variable names.
- How missing game-log or season data should be represented.
- Whether the live provider requires small contract changes.
- Deployment implications.

> Do not select the external NBA API during this documentation turn. `PROJECT_SPEC.md` and
> `DECISIONS.md` do not mandate a specific provider, so the choice is deferred to the planning
> turn, which must compare realistic options against the questions above and record the decision
> (and any significant architectural choice) as a new ADR in `docs/DECISIONS.md`.

## Acceptance Criteria

- [ ] The backend can run with the live provider selected through configuration.
- [ ] Search returns current live NBA players.
- [ ] Profiles return normalized live information.
- [ ] Seasons return normalized available seasons.
- [ ] Statistics return current provider-backed values.
- [ ] Career trends use live provider data.
- [ ] Game logs use live provider data where supported.
- [ ] Comparison works without frontend changes beyond necessary compatibility fixes.
- [ ] Fixture mode remains available for tests.
- [ ] Rate limits and upstream failures produce controlled user-facing states.
- [ ] No API key reaches the browser.
- [ ] The full existing regression suite passes.
- [ ] Provider-specific tests pass using mocked responses.
- [ ] Manual live verification succeeds.
- [ ] Documentation clearly explains setup and limitations.
- [ ] Formatting passes.
- [ ] Lint passes.
- [ ] Strict type checking passes.
- [ ] Tests pass.
- [ ] Production build passes.
- [ ] Full root validation passes.

## Definition Of Done

- The deferred planning questions are resolved in a fresh planning turn before implementation.
- The bounded TASK-008 behaviour is implemented without violating architecture boundaries.
- All acceptance criteria are verified.
- Formatting, lint, strict type checking, tests, production build, and full validation pass.
- Provider contract tests and mocked upstream HTTP tests pass; CI runs without a real key or
  network access.
- Manual live verification passes and limitations are documented.
- The complete Git diff is reviewed.
- `docs/PROJECT_STATE.md` and this task document are updated with verified results.
- Significant architectural decisions (provider choice, caching, retries, fallback policy, any
  contract change) are recorded as new ADRs without rewriting existing ADR history.
- No commit or push occurs unless explicitly instructed.
