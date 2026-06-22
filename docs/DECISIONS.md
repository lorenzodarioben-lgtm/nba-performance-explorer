# Architecture Decision Records — NBA Performance Explorer

This file records significant decisions. Each entry has a stable ID, a status, the context
that prompted it, the decision itself, and its consequences. New significant decisions must
be appended here (do not rewrite history; supersede instead).

> Status legend: Accepted · Superseded · Proposed

---

## ADR-001 — Use TanStack Query for remote/server state

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** The application is read-heavy and built around fetching player, season, and
game data from our backend. We need consistent caching, loading/error handling, and
refetching without hand-rolling it per screen.

**Decision.** Use TanStack Query as the single owner of remote/server state. All data
fetched from our backend flows through it.

**Consequences.** Caching, request de-duplication, and loading/error states are handled in
one consistent place. Server state is kept out of any global client-state store. Local UI
state stays in React state and shareable filters stay in the URL (see ARCHITECTURE.md).

---

## ADR-002 — Use a backend data-provider abstraction

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** There are multiple possible NBA data sources, with different shapes, terms,
and reliability. Coupling the application to one source would make it brittle and hard to
change.

**Decision.** The backend depends on a data-provider interface, not on any specific NBA
data source. Concrete providers (fixtures now, a live source later) implement that
interface and map their raw responses into internal domain models.

**Consequences.** The frontend is not coupled to any single NBA data source. Swapping data
sources is a configuration and wiring change behind the backend, not a rewrite. Provider
response shapes never leak past the provider boundary.

---

## ADR-003 — Protect API credentials through the backend

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** Any live NBA data source will require credentials. Shipping those to the
browser would expose them publicly.

**Decision.** All credentialed access happens in the backend. API credentials are never
included in the frontend bundle and never committed. Secrets are provided via environment
variables; a committed `.env.example` documents variable names with no real values, and
real `.env` files are git-ignored.

**Consequences.** The frontend only ever talks to our own backend. Secrets stay server-side.
This is enforced as a security requirement and is part of the definition of done.

---

## ADR-004 — Use Recharts initially instead of D3

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** The product needs interactive performance charts. D3 is powerful but
lower-level and slower to build with; we want to reach a working, accessible chart quickly.

**Decision.** Use Recharts for visualisations initially.

**Consequences.** Faster delivery of standard charts with sensible defaults. If a future
visualisation genuinely exceeds what Recharts can do, that need will be recorded as a new
decision before adopting a lower-level library such as D3.

---

## ADR-005 — Develop against fixture data before connecting a live provider

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** A live NBA API adds credentials, rate limits, and instability that would slow
down building the core application and its tests.

**Decision.** Build against fixture / mock data first. A live provider is integrated only
after the application and its tests are working against fixtures. No live NBA API
integration happens during TASK-001.

**Consequences.** The team can build and test the full core journey deterministically and
offline. The data-provider abstraction (ADR-002) makes the later switch to a live source
low-risk.

---

## ADR-006 - Use npm workspaces

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** The frontend, backend, and shared API contracts need independent package
boundaries while remaining simple to install and validate as one repository.

**Decision.** Use npm workspaces with exactly `frontend`, `backend`, and
`packages/contracts`, managed by one root `package-lock.json`.

**Consequences.** A single `npm ci` installs the repository, root scripts coordinate all
workspaces, and no additional monorepo orchestrator is required.

---

## ADR-007 - Share API contracts through a workspace

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** Duplicating response schemas in the frontend and backend would allow their
runtime validation and TypeScript types to drift.

**Decision.** Define Zod schemas and inferred TypeScript API types once in
`packages/contracts`. Both applications import the same compiled package.

**Consequences.** API response changes have one source of truth. The contracts workspace
must build before commands that consume it.

---

## ADR-008 - Separate the Express application from the local server

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** Tests and future serverless adapters need the Express application without
opening a network port.

**Decision.** `backend/src/app.ts` creates and exports the Express application.
`backend/src/server.ts` is the local process entry point that calls `listen`.

**Consequences.** Supertest can exercise the application directly, local development
remains straightforward, and a future deployment adapter can reuse the app without
changing route setup.

---

## ADR-009 - Standardize the repository on Node.js 22

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** Development, CI, and package compatibility need a documented runtime target.

**Decision.** Target Node.js 22 with root engines `>=22.12.0 <23`, `.nvmrc` set to `22`,
and GitHub Actions configured for Node.js 22.

**Consequences.** Contributors and CI share one runtime major. Dependencies must remain
compatible with the supported Node.js 22 range.

---

## ADR-010 - Integrate Tailwind CSS through the Vite plugin

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** Tailwind CSS 4 provides a first-party Vite integration that avoids a separate
PostCSS configuration for this application.

**Decision.** Use `tailwindcss` with `@tailwindcss/vite` in the frontend Vite configuration
and import Tailwind from the application stylesheet.

**Consequences.** Styling participates directly in the Vite pipeline with minimal
configuration.

---

## ADR-011 - Use React Router Declarative Mode

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** The application needs client-side routing and shareable URLs, but TASK-001
does not need framework mode, route loaders, SSR, or data-router APIs.

**Decision.** Use the `react-router` package with `BrowserRouter`, `Routes`, and `Route`.
The installed stable release is React Router 7.18.0 because React Router 8.0.1 requires
Node.js 22.22.0 or newer, outside the TASK-001 verification environment.

**Consequences.** Routing stays component-based and compatible with Node.js 22.19.0. A
future upgrade must preserve Declarative Mode unless a separate decision changes the
routing architecture.

---

## ADR-012 - Use relative API requests with a Vite development proxy

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** Local frontend development should call the backend without browser CORS
configuration, while deployed environments may place the API on another non-secret
origin.

**Decision.** The frontend requests relative `/api` URLs by default. Vite proxies `/api` to
the local backend. `VITE_API_BASE_URL` may optionally provide a non-secret base URL.

**Consequences.** Local development remains same-origin and simple. Credentials must never
be placed in `VITE_` variables because those values are exposed to browser code.

---

## ADR-013 - Use direct NBA.com Stats access with accepted product risks

- **Status:** Accepted
- **Date:** 2026-06-21

**Context.** TASK-008 needs live player search, profiles, complete historical regular-season
statistics, career trends, game logs, and two-player comparison while preserving the NBA.com
person IDs already used by routes, fixtures, tests, and bookmarks. API-Sports was validated and
rejected because its proprietary IDs, incomplete search behavior, limited historical coverage,
multi-request career discovery, game-log joins, and 100-request daily free tier did not fit the
application. Direct NBA.com Stats access was validated locally from Node.js 22 against
`commonplayerinfo`, `playercareerstats`, and `playergamelog`. A Python `nba_api` sidecar would call
the same upstream endpoints and showed no reliability advantage.

NBA.com Stats is undocumented and unsupported as a public API. NBA.com terms may restrict a
public, comprehensive, regularly updated statistics application and may require written
permission. Shared cloud-hosting IP ranges may be blocked or time out, and endpoint availability
or schemas may change without notice. The project owner understands and accepts those product,
legal, and reliability risks for this low-traffic portfolio project.

**Decision.** Implement `NbaStatsPlayerProvider` as a direct Node.js 22 `fetch` implementation
behind the existing `PlayerProvider` interface. Use only `commonallplayers`,
`commonplayerinfo`, `playercareerstats`, and `playergamelog` for TASK-008. Search a cached live
`commonallplayers` directory locally. Select the provider explicitly with
`NBA_DATA_PROVIDER=fixture|nba-stats`; fixture mode remains the default for tests, CI, and offline
demonstrations. Live mode uses a configurable 10-second timeout, private Zod validation, bounded
process-local caching, stable provider errors, zero automatic retries, and no silent fixture
fallback.

Preserve NBA.com person IDs. Widen the public player/profile/season contracts so team fields may be
absent for free agents, inactive or retired players, and multi-team aggregate seasons. Never
represent NBA.com's `TOT` aggregate marker as a real team.

No proxy, WAF bypass, IP rotation, cookie harvesting, or other blocking-evasion technique is
authorized. Before live production mode is enabled, the intended deployment environment must pass
a bounded connectivity check against all four selected endpoints. A failed deployment check stops
production enablement.

**Consequences.** The provider matches the application's current domain closely, keeps existing
player URLs stable, obtains complete career statistics efficiently, and requires no Python
runtime. The backend must add a direct `zod` dependency for private upstream schemas, implement
browser-compatible request headers, and maintain a bounded in-memory cache. The frontend must
render explicit `No current team` and `Multiple teams` states after the optional-team contract
widening. Automated tests remain completely offline.

The application and README must state prominently that the project is unofficial and unaffiliated
with the NBA, attribute NBA statistics and data to NBA.com, and disclose that endpoint stability,
availability, and deployment reachability are not guaranteed. Local success does not imply that a
cloud deployment will work.

---

## ADR-014 - Deploy on Render as a single same-origin web service with a fixture fallback

- **Status:** Accepted
- **Date:** 2026-06-22

**Context.** TASK-009 needs a publicly accessible, low-cost production deployment of the React/Vite
frontend and the Node.js 22 / Express backend. Current (2026) research found that Railway and
Fly.io no longer offer a genuine free tier, while Render and Koyeb do, and Vercel/Netlify are free
for static frontends. `stats.nba.com` is widely reported to block cloud datacenter IP ranges, so
live mode from any cloud host is uncertain and is gated by ADR-013. The project prioritizes
minimal cost, Node 22 support, GitHub deployment, HTTPS, secure environment variables, health
checks, rollback, and the simplest possible maintenance.

**Decision.** Deploy a single Render free Web Service that serves both the built frontend
(`frontend/dist`, with an SPA fallback) and the existing `/api` routes from the one Express
process, keeping the browser same-origin (relative `/api`, `VITE_API_BASE_URL` empty) with no
CORS and no cross-service proxy. Build with `npm ci && npm run build`; start with
`node backend/dist/server.js`; select Node 22 via root `engines`. Configure the health check at
`/api/health`. Static serving is gated by a `FRONTEND_DIST` environment variable so tests and the
existing `/api` 404 behavior are unchanged. Run the ADR-013 connectivity gate from the deployed
host before enabling live mode. Render runs the service with `NODE_ENV=production`, so the initial
fixture deployment explicitly sets `NBA_DATA_PROVIDER=fixture` and
`NBA_ALLOW_FIXTURE_IN_PRODUCTION=true`. If all four endpoints pass, set
`NBA_DATA_PROVIDER=nba-stats`, remove the fixture allowance or set it to `false`, and redeploy. If
any endpoint fails, retain the explicitly approved fixture demonstration. Production still
requires an explicit provider selection, and live-provider failures never silently fall back to
fixtures. CI stays offline and fixture-backed and does not deploy.

**Consequences.** One service, one HTTPS URL, one deploy, and one rollback give the simplest
maintenance, at the cost of a whole-app cold start on the free tier (~1 minute after 15 minutes
idle), optionally mitigated by a free uptime ping within the 750 free instance-hours/month. The
backend gains a small env-gated static-serving block and a connectivity-gate script. Because the
host's cloud IP is likely blocked by NBA.com, the public deployment will probably run in fixture
mode; the documentation must state that live data is disabled in that case, that this is the
accepted ADR-013 outcome, and that no blocking-evasion is used. Alternatives (Render static plus
web service, Vercel plus Render, Koyeb) were considered and recorded in the TASK-009 plan; they
add a second service or platform and cross-origin routing without improving NBA.com reachability.
