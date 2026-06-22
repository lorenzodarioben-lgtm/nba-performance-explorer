# TASK-009 — Production Deployment

- **Milestone:** Production Deployment
- **Status:** Documentation-defined; implementation not started
- **Branch:** `feature/production-deployment`

> Read `AGENTS.md`, `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`,
> and `docs/DECISIONS.md` before any work. TASK-001 through TASK-008 are completed and merged.
> This document defines scope only; it selects no hosting provider and changes no application
> code or configuration. A separate planning-only turn must browse current hosting and provider
> documentation and resolve the deferred questions before implementation.

## Status

TASK-009 is documentation-defined. No deployment, hosting account, resource, application-code,
dependency, manifest, lockfile, environment-file, or secret change has been made. The next turn
is a planning-only turn that must compare realistic deployment architectures against current
official hosting documentation.

## Objective

Deploy the NBA Performance Explorer to a publicly accessible production environment while
preserving security, test reliability, the backend `PlayerProvider` boundary, fixture mode, and
truthful documentation.

The deployment must include a public frontend and a public backend, and it must verify that the
production backend can reach the four approved NBA.com Stats endpoint families
(`commonallplayers`, `commonplayerinfo`, `playercareerstats`, `playergamelog`) **before** live
mode (`NBA_DATA_PROVIDER=nba-stats`) is enabled in production. If that connectivity gate fails,
live production mode must not be enabled.

## User Value

A reviewer (for example a hiring manager) can open a public URL and use the full product —
search, profiles, seasons, statistics, career trends, game logs, and two-player comparison — over
HTTPS, with accessible loading, empty, timeout, unavailable, and malformed-provider states, and
without any secret or provider internal being exposed.

## Verified Starting State

- TASK-001 through TASK-008 are completed and merged into `main`.
- TASK-008: planning-definition commit `1a49c24`; final provider-plan commit `4be8852`;
  implementation commit `7f6a33d`; documentation pull request #8 (merge `6b417eb`); implementation
  pull request #9 (merge `f8256d2`).
- The merged baseline passes 312 tests: 139 frontend and 173 backend; all offline.
- The production bundle is 714.05 KB JavaScript (212.81 KB gzip) and 13.47 KB CSS (3.46 KB gzip);
  the existing Vite chunk-size warning is known and non-blocking.
- Runtime supports `fixture` (default) and `nba-stats` provider modes
  (`NBA_DATA_PROVIDER`, `NBA_STATS_TIMEOUT_MS`); secrets are not required by NBA.com Stats.
- The frontend talks only to this repository's backend; the backend is the only component that
  calls NBA.com. CI runs offline on Node.js 22 (`npm ci` + `npm run validate`).
- No public deployment exists, and NBA.com connectivity from a cloud host is unverified.

## In Scope

Define and deliver a deployment vertical slice covering:

- Current hosting-provider research (performed in the following planning turn, not here).
- Frontend hosting.
- Backend hosting.
- Production build and start commands.
- Node.js 22 compatibility on the chosen host(s).
- Environment-variable and secret configuration.
- `NBA_DATA_PROVIDER=nba-stats` production configuration.
- `NBA_STATS_TIMEOUT_MS` production configuration.
- The backend health endpoint (`GET /api/health`) as a production health check.
- Frontend-to-backend API routing.
- HTTPS.
- CORS or same-origin reverse-proxy design.
- Production logging (no secrets or sensitive headers).
- The deployment-host NBA.com connectivity gate (see below).
- Failure behavior when NBA.com is unreachable (controlled errors, no silent fixture fallback).
- A fixture-mode deployment option for troubleshooting or demonstration.
- Build and deployment automation.
- GitHub integration (auto-deploy / preview where supported).
- Environment separation (production vs preview/staging).
- Rollback strategy.
- Production smoke testing.
- Accessibility and responsive smoke testing.
- Provider-error state verification in production.
- Rate-limit and timeout state verification in production.
- Cost controls.
- Free-tier sleep and cold-start implications.
- Process-local cache limitations across instances/restarts.
- Documentation of the public URL.
- Final deployment evidence.

## Mandatory Deployment Connectivity Gate

Before production live mode is approved, the selected backend deployment environment must
successfully reach all four approved endpoint families:

- `commonallplayers`
- `commonplayerinfo`
- `playercareerstats`
- `playergamelog`

The gate must:

- run from the actual deployment host (not a developer machine);
- avoid exposing headers, cookies, URLs containing sensitive parameters, or raw bodies;
- use only a small, quota-conscious sample;
- confirm an acceptable response status and JSON content type;
- stop deployment approval if any endpoint is blocked, challenged, or returns invalid content;
- never use proxies, rotating IPs, cookie harvesting, CAPTCHA bypassing, WAF bypassing, or any
  other blocking-evasion technique.

If the gate fails, live production mode must not be enabled. The deployment may remain
fixture-backed, or another approved architecture decision must be made in a separate planning
turn. This gate operationalizes ADR-013.

## Out of Scope (Explicit Exclusions)

- New product features.
- Authentication or user accounts.
- Favourites.
- Predictions.
- Rankings.
- Advanced NBA metrics.
- Play-by-play.
- Shot charts.
- Database persistence.
- Distributed caching.
- Mobile applications.
- Replacing React, Express, TanStack Query, or the provider boundary.
- Replacing NBA.com with another data provider.
- Bypassing NBA.com blocking.
- Paid infrastructure without explicit approval.
- Custom-domain purchase unless separately approved.
- Major frontend redesign.
- Bundle optimization beyond a separately approved fix.
- Final résumé and portfolio case-study writing (that is TASK-010).

## Architecture Requirements

These follow ARCHITECTURE.md and ADR-003/ADR-012/ADR-013 and must not be violated:

- The frontend communicates only with the project backend.
- The backend remains the only component that calls NBA.com.
- Secrets and backend configuration must not enter frontend bundles (no secret in any `VITE_`
  variable).
- Real `.env` files remain untracked; only `.env.example` is committed, with no real values.
- Production must not silently fall back to fixtures after live mode is explicitly selected.
- Deployment configuration must fail clearly when invalid (the existing fail-before-listen
  startup validation is preserved).
- Automated tests and CI remain offline and fixture-backed.
- The existing 312-test regression baseline must remain passing.
- Deployment-specific configuration must be documented.
- Public documentation must accurately distinguish tested behavior from unverified assumptions.
- The application must expose a production health check that does not consume NBA.com quota
  (`GET /api/health` does not call the provider).
- The deployment must not claim live-provider success until the host connectivity gate passes.

## Deferred Planning Questions

The next planning-only turn must browse current official hosting and provider documentation and
pricing before deciding (do not answer these here):

- Frontend host.
- Backend host.
- Whether one combined host or separate hosts should be used.
- Current free-tier availability and pricing.
- Node.js 22 support.
- Sleep and cold-start behavior.
- Build-minute limits.
- Bandwidth limits.
- Environment-variable and secret handling.
- Custom-domain support.
- Deployment-region options.
- GitHub auto-deployment support.
- Health-check support.
- Log-retention limits.
- Whether the host permits or blocks NBA.com traffic.
- CORS versus reverse-proxy architecture.
- Production frontend API base URL strategy (`VITE_API_BASE_URL` vs same-origin proxy).
- Preview/staging environments.
- Rollback process.
- Deployment evidence required.
- Whether a fixture-backed public fallback deployment is acceptable if the connectivity gate
  fails.

> Do not select hosting providers in this definition turn. `PROJECT_SPEC.md` and `DECISIONS.md`
> mandate no specific host, so the choice is deferred to the planning turn, which must compare
> realistic options and record the decision (and any significant architectural choice) as a new
> ADR in `docs/DECISIONS.md`.

## Acceptance Criteria

- [ ] Hosting decisions are documented using current official sources.
- [ ] The frontend and backend deploy successfully.
- [ ] Production uses supported Node.js 22 tooling.
- [ ] HTTPS is enabled.
- [ ] Environment variables are configured securely.
- [ ] No secret reaches the browser, logs, repository, screenshots, or documentation.
- [ ] The health check succeeds and does not consume NBA.com quota.
- [ ] The frontend can reach the deployed backend.
- [ ] The deployment-host NBA.com connectivity gate passes before live mode is enabled.
- [ ] Search works publicly.
- [ ] Player profiles work publicly.
- [ ] Available seasons and statistics work publicly.
- [ ] Career trends work publicly.
- [ ] Game logs work publicly.
- [ ] Two-player comparison works publicly.
- [ ] Loading, empty, timeout, unavailable, and malformed-provider states remain controlled.
- [ ] Fixture mode remains available for controlled troubleshooting.
- [ ] The full automated regression suite (312 tests) passes.
- [ ] Production smoke tests pass.
- [ ] Mobile and desktop layouts are verified.
- [ ] Accessibility-critical interactions are smoke-tested.
- [ ] The public URL and limitations are documented.
- [ ] The rollback procedure is documented.
- [ ] No unsupported blocking-evasion mechanism is used.
- [ ] No false claim of guaranteed NBA.com availability is made.

## Next-Turn Requirement (planning-only)

The following TASK-009 planning-only session must:

- browse current official hosting documentation and pricing;
- compare at least three realistic deployment architectures;
- assess NBA.com cloud-connectivity risk;
- produce a provider comparison matrix;
- choose a deployment architecture;
- define exact environment variables and build/start commands;
- define exact files to modify;
- define the connectivity-gate procedure;
- define the CI/deployment workflow;
- define rollback and smoke-testing procedures;
- make no implementation changes.

## Definition Of Done

- The deferred planning questions are resolved in a fresh planning turn before implementation.
- The bounded TASK-009 deployment is implemented without violating architecture boundaries.
- All acceptance criteria are verified.
- The deployment-host connectivity gate passes before production live mode is enabled (or the
  deployment remains fixture-backed with the limitation documented).
- The full automated regression suite, formatting, lint, strict type checking, and production
  build pass; CI remains offline and fixture-backed.
- Production and accessibility/responsive smoke tests pass and evidence is recorded.
- The complete Git diff is reviewed.
- `docs/PROJECT_STATE.md` and this task document are updated with verified results, including the
  public URL and limitations.
- Significant architectural decisions (host choice, CORS/proxy design, connectivity-gate outcome,
  any fixture-fallback policy) are recorded as new ADRs without rewriting existing ADR history.
- No commit or push occurs unless explicitly instructed.
