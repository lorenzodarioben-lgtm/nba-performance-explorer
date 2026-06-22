# TASK-009 — Production Deployment

- **Milestone:** Production Deployment
- **Status:** Planning complete; implementation not started
- **Branch:** `feature/production-deployment`

> Read `AGENTS.md`, `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`,
> and `docs/DECISIONS.md` before any work. TASK-001 through TASK-008 are completed and merged.
> This document defines scope only; it selects no hosting provider and changes no application
> code or configuration. A separate planning-only turn must browse current hosting and provider
> documentation and resolve the deferred questions before implementation.

## Status

TASK-009 planning is complete (see "Implementation Plan"); implementation has not started. No
deployment, hosting account, resource, application-code, dependency, manifest, lockfile,
environment-file, or secret change has been made.

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

## Implementation Plan (planning turn, 2026-06-22)

### Research summary

Current (2026) hosting was checked against official sources. Railway ($1/month credit after the
first month) and Fly.io (no free tier; trial only) are no longer genuinely free. Render and Koyeb
offer real free tiers; Vercel/Netlify are free for static frontends plus serverless functions.
Crucially, `stats.nba.com` is widely reported to block cloud datacenter IP ranges (AWS,
DigitalOcean, Heroku, and similar) with timeouts or 403s, so live mode from any cloud host is at
risk and is governed by the ADR-013 connectivity gate.

### Comparison matrix

| Criterion | A. Render single web service (chosen) | B. Render static + web service | C. Vercel (FE) + Render (BE) | D. Koyeb web service |
|---|---|---|---|---|
| Cost | Free | Free | Free | Free |
| Node 22 | Yes (engines) | Yes | Yes (BE) | Yes |
| GitHub deploy | Yes | Yes | Yes | Yes |
| HTTPS | Yes | Yes | Yes | Yes |
| Env vars / secrets | Yes | Yes | Yes | Yes |
| Health check | `/api/health` | Yes (BE) | Yes (BE) | Yes |
| Sleep / cold start | Whole app sleeps 15 min, ~1 min | FE always-on; BE sleeps | FE always-on; BE sleeps | Scales to zero after 1 h |
| Rollback | Render (2 most recent) | Render | Vercel + Render | Koyeb redeploy |
| NBA.com reachability | Likely blocked → gate | Same | Same | Same |
| Same-origin | Yes (Express serves static) | Needs rewrite or CORS | Needs rewrite or CORS | Yes (single service) |
| Maintenance | Simplest (1 service, 1 URL) | 2 services | 2 platforms | 1 service (region-limited) |

### Chosen architecture: single Render free Web Service, same-origin

A single Render Web Service (free, Node 22) runs the Express backend, which also serves the built
frontend (`frontend/dist`) as static assets with an SPA fallback, alongside the existing `/api`
routes. One service, one HTTPS URL, no CORS, no cross-service proxy, no dependency on uncertain
platform features — the simplest to maintain. The whole-app cold start is the trade-off; it is
acceptable for a low-traffic portfolio and can be mitigated with a free uptime ping (the 750 free
instance-hours/month cover near-continuous uptime). NBA.com reachability is identical across all
cloud options, so it does not differentiate them.

### Selected hosts

- Frontend and backend: one Render Web Service named e.g. `nba-performance-explorer`. No separate
  frontend host.

### Exact build and start commands

- Build: `npm ci && npm run build` (root; builds contracts, then `frontend/dist`, then
  `backend/dist`).
- Start: `node backend/dist/server.js`.
- Node version from root `package.json` `engines` (`>=22.12.0 <23`); optionally pin with a
  `.node-version` file containing `22`.

### Exact environment variables (set in Render; never committed)

Live mode (only after the connectivity gate passes):

- `NODE_ENV=production`
- `NBA_DATA_PROVIDER=nba-stats`
- `NBA_STATS_TIMEOUT_MS=10000`
- `FRONTEND_DIST=<resolved path to frontend/dist>` (enables static serving)
- `PORT` — provided automatically by Render; the server already binds `process.env.PORT`.

Fixture demonstration / gate-fail fallback:

- `NBA_DATA_PROVIDER=fixture`
- `FRONTEND_DIST=<resolved path to frontend/dist>`
- Leave `NODE_ENV` unset (or non-`production`). The implemented startup guard rejects `fixture`
  (or absent) when `NODE_ENV=production`, so a deliberate fixture demo must not set
  `NODE_ENV=production`. This preserves the "no fixture in live production" rule while still
  allowing the approved fixture demonstration.
- No secret is required in either mode.

### Frontend API URL strategy

Same-origin: `VITE_API_BASE_URL` stays empty so the frontend calls relative `/api` (ADR-012). The
single service serves both, so no cross-origin base URL is needed.

### CORS or proxy strategy

None — a same-origin single service requires neither CORS nor a reverse proxy.

### Health-check configuration

Render Health Check Path: `/api/health`. It returns 200 `{ "status": "ok", ... }` and does not
call NBA.com, so it consumes no upstream quota.

### Required repository files to add or modify (implementation turn)

- Add `render.yaml` (Blueprint): the single web service with build/start commands, health-check
  path, and non-secret env vars (secrets set in the dashboard).
- Modify `backend/src/app.ts` (or a small static-serving helper): when `FRONTEND_DIST` points to
  an existing directory, serve it with `express.static` plus an SPA fallback for non-`/api` GET
  requests, mounted after the `/api` routes and before `notFoundHandler`. Env-var-gated so tests
  and `/api` 404 behavior are unchanged (tests never set `FRONTEND_DIST`).
- Add `backend/src/scripts/nba-connectivity-gate.ts` (compiled to `backend/dist/...`): the
  deployment-host gate (below), reusing the existing NBA Stats HTTP client. Its tests mock fetch.
- Optionally add `.node-version` (`22`).
- Update `README.md` (deployment + public URL + limitations), `docs/PROJECT_STATE.md`, and
  `docs/DECISIONS.md` (ADR-014) with verified results.
- No change to shared contracts, the provider, the cache, or existing test behavior.

### CI / deployment workflow

- Keep the existing GitHub Actions CI (`npm ci` + `npm run validate`) unchanged: offline,
  fixture-backed, on push/PR, no secret, no deploy.
- Deployment: connect the repo to Render (Blueprint from `render.yaml`); Render auto-deploys on
  push to `main`. No NBA.com key is required. Preview/staging environments are out of scope.

### Deployment-host NBA.com connectivity-gate procedure

- After deploying in fixture mode, run the gate FROM the Render host (a Render one-off Job or the
  service shell): `node backend/dist/scripts/nba-connectivity-gate.js`.
- It performs a tiny, quota-conscious sample with the existing client and headers: one
  `commonallplayers` (current season), one `commonplayerinfo` (`2544`), one `playercareerstats`
  (`2544`), one `playergamelog` (`2544`, one season).
- For each endpoint it checks only HTTP status and JSON content type and prints `PASS`/`FAIL`. It
  logs no URLs-with-parameters, headers, cookies, or bodies, and exits non-zero if any endpoint is
  blocked, challenged, times out, or returns non-JSON.
- No proxy, IP rotation, cookie harvesting, CAPTCHA bypass, or WAF bypass is used.
- All four `PASS` → set `NODE_ENV=production` + `NBA_DATA_PROVIDER=nba-stats` and redeploy (live
  mode). Any `FAIL` → keep fixture mode; do not enable live.

### Fixture-mode fallback if the gate fails

Keep `NBA_DATA_PROVIDER=fixture` (NODE_ENV unset). The public site stays fully usable with
deterministic fixture data across all features for demonstration. Document prominently that live
NBA.com data is disabled because the deployment host cannot reach NBA.com, that this is the
ADR-013 accepted outcome, and that no evasion is used.

### Production smoke tests (after each deploy)

- `GET /api/health` → 200 `{ "status": "ok" }`.
- Load `/` and exercise: a player search; open a profile; switch seasons; selected-season stats;
  career trends (chart + accessible table); a game log; a two-player comparison; and at least one
  controlled empty/error state.
- Live mode only: confirm live values and that timeout/unavailable/invalid provider states map to
  504/503/502 with generic messages.
- Verify ~375 px and desktop layouts, keyboard navigation, and a single page `<h1>` per route.
- Confirm no secret appears in the page, bundle, network traffic, or logs.

### Rollback procedure

- Render dashboard → service → Deploys → Rollback to a previous successful deploy (Render keeps
  the two most recent). For code-level rollback, `git revert` the offending commit on `main` and
  push (Render auto-redeploys). Record the known-good deploy.

### Cost and platform limitations

- Free Render web service sleeps after 15 min idle (~1 min cold start); 750 instance-hours/month;
  500 build-minutes/month; shared free bandwidth.
- The process-local cache is not shared across restarts/instances and is lost on spin-down.
- `stats.nba.com` likely blocks the host's cloud IP, so live mode may be unavailable; the gate
  decides.
- No custom domain purchase; the default `*.onrender.com` HTTPS URL is used.

### Resolution of the deferred planning questions

One Render free Web Service is both frontend and backend host (same-origin) — combined for
simplest maintenance. Free tier; Node 22; sleeps 15 min/~1 min cold start; 750 hrs and 500 build
min per month; bandwidth shared. Env/secrets via the Render dashboard (none required). No custom
domain. Region: a US region (e.g. Oregon) — does not change NBA.com blocking. GitHub auto-deploy:
yes. Health check: `/api/health`. Log retention: free-tier recent logs only. Whether the host
reaches NBA.com: unknown until the gate runs (likely blocked). CORS vs proxy: neither
(same-origin). Production API base URL: relative `/api`. Preview/staging: out of scope. Rollback:
Render redeploy or `git revert`. Evidence: deploy logs, smoke-test results, and the public URL. A
fixture-backed public fallback is approved as the gate-fail outcome.

### Repository implementation status (uncommitted)

The repository-side deployment work is implemented on `feature/production-deployment` and left
uncommitted for review (no deployment, hosting account, commit, push, or live NBA.com request was
made):

- `render.yaml` — one free Render web service: Node 22, `npm ci && npm run build`,
  `node backend/dist/server.js`, `/api/health` health check, fixture mode default, `FRONTEND_DIST`
  set.
- `backend/src/app.ts` — env-gated (`FRONTEND_DIST`) same-origin static serving with an SPA
  fallback that excludes `/api`; unset leaves the app API-only and fails fast on a missing build.
- `backend/src/scripts/nba-connectivity-gate.ts` plus the `connectivity-gate` backend npm script —
  the deployment-host gate over the four endpoints with sanitized PASS/FAIL output and a nonzero
  exit on failure, reusing the existing HTTP client.
- Offline tests `backend/src/app-static.test.ts` and
  `backend/src/scripts/nba-connectivity-gate.test.ts` cover static serving, SPA fallback, API not
  intercepted, the unset/ invalid-config cases, and gate success/failure with a fake client. No
  test contacts the internet, and no dependency was added.

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
