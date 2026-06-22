# NBA Performance Explorer

> **Status:** Functioning full-stack application with player search, profiles, selected-season
> statistics, career trends, game logs, and two-player comparison. A live NBA.com Stats provider
> (TASK-008) is implemented behind the backend provider boundary and selected with
> `NBA_DATA_PROVIDER`; fixtures remain the default for tests, CI, and offline use. This is an
> unofficial project (see "NBA.com Data Notice"). TASK-008 is completed and merged into `main`
> through pull request #9. Production deployment work is in progress, but no successful public
> deployment exists yet and deployment-host NBA.com connectivity remains unverified.

NBA Performance Explorer is a portfolio web application for exploring NBA player
performance. The product scope and planned user journey are documented in
[`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md).

## Prerequisites

- Node.js `>=22.12.0 <23` (Node.js `22.19.0` was used for TASK-001 verification).
- npm `10.9.3` or a compatible npm version included with Node.js 22.
- Git.

The repository includes `.nvmrc` with the Node.js major version:

```sh
nvm use
```

## Installation

Install all three npm workspaces from the repository root:

```sh
npm ci
```

The repository uses one root `package-lock.json`.

## Development

Start the frontend and backend together:

```sh
npm run dev
```

The frontend runs at `http://localhost:5173` and the backend runs at
`http://localhost:3001`.

Start one application at a time:

```sh
npm run dev:frontend
npm run dev:backend
```

The frontend requests `GET /api/health`. During local development, Vite proxies `/api`
requests to the backend, so normal local development does not require CORS configuration.

## Validation

Run an individual quality gate from the repository root:

```sh
npm run format
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Run the complete CI validation sequence:

```sh
npm run validate
```

`validate` runs the formatting check, linting, strict type checking, tests, and production
build.

## Workspace Structure

```text
frontend/           React, TypeScript, Vite, Tailwind CSS, and TanStack Query
backend/            Express 5 API with separate application and server entry points
packages/contracts/ Shared Zod schemas and inferred TypeScript API types
```

The frontend and backend import shared Zod schemas and inferred API types from the contracts
workspace. API schemas are not duplicated between applications.

## Environment Variables

Tracked examples are provided at:

- `frontend/.env.example`
- `backend/.env.example`

Frontend:

- `VITE_API_BASE_URL` is an optional, non-secret API origin override. When it is empty or
  unset, requests use same-origin relative URLs. Never place credentials, API keys, or
  tokens in a `VITE_` variable because Vite exposes those values to browser code.

Backend:

- `PORT` optionally changes the local API port from the default `3001`.

TASK-008 data-provider configuration:

- `NBA_DATA_PROVIDER=fixture|nba-stats` selects fixture or direct NBA.com Stats data. When
  absent outside production, it defaults to `fixture`. Tests and CI use `fixture` and never
  contact NBA.com.
- Production requires an explicit provider selection. An absent provider fails startup.
- Fixture mode in production is permitted only when
  `NBA_ALLOW_FIXTURE_IN_PRODUCTION=true`. Without that explicit approval, selecting
  `fixture` in production fails startup.
- `NBA_ALLOW_FIXTURE_IN_PRODUCTION=true|false` is a strict safety switch for an intentionally
  fixture-backed public demonstration. It defaults to disabled when absent.
- `NBA_STATS_TIMEOUT_MS` controls the live-provider request timeout. It must be an integer
  from `1000` through `30000` and defaults to `10000`.
- Invalid configuration fails before the server begins listening.
- A configured `nba-stats` provider never silently falls back to fixture data after an
  upstream failure.
- NBA.com Stats requires no API key. No provider setting belongs in a `VITE_` variable.

Real `.env` files are ignored by Git. Example files contain non-secret values only.

## NBA.com Data Notice

This is an unofficial portfolio project and is not affiliated with, endorsed by, or sponsored by
the National Basketball Association. When the live provider is enabled
(`NBA_DATA_PROVIDER=nba-stats`), NBA statistics and data are sourced from NBA.com.

NBA.com Stats is undocumented and unsupported as a public API. Endpoint availability, schema
stability, historical correctness, uptime, and access from shared cloud-hosting networks are not
guaranteed. NBA.com terms may restrict public use of a comprehensive, regularly updated
statistics application and may require written permission.

The project does not use proxies, IP rotation, WAF bypasses, cookie harvesting, CAPTCHA
bypasses, or other blocking-evasion techniques. Local connectivity does not guarantee that a
deployed host can reach NBA.com. A deployment-host connectivity gate must pass before live mode
is enabled publicly.

Fixture mode remains available for tests, CI, offline use, and explicitly approved public
demonstrations.

## Deployment

The repository includes a Render Blueprint ([`render.yaml`](render.yaml)) that provisions one free
web service. The Express backend serves the built frontend and the `/api` routes from a single
origin (ADR-014), so no separate frontend host, CORS configuration, or cross-service proxy is
required.

Deployment configuration:

- Build command: `npm ci && npm run build`
- Start command: `node backend/dist/server.js`
- Node.js version: Node 22 from `.nvmrc` and the root `package.json` engines field
- Health-check path: `/api/health`
- `PORT` is provided automatically by Render.
- Render runs the deployed service with `NODE_ENV=production`.
- `FRONTEND_DIST=frontend/dist` enables same-origin static frontend serving.
- Non-secret deployment variables are declared in `render.yaml`.
- Neither fixture mode nor the NBA.com Stats provider requires an API key.

### Initial fixture deployment

The Blueprint initially deploys with:

```text
NBA_DATA_PROVIDER=fixture
NBA_ALLOW_FIXTURE_IN_PRODUCTION=true
NBA_STATS_TIMEOUT_MS=10000
FRONTEND_DIST=frontend/dist
```

`NBA_ALLOW_FIXTURE_IN_PRODUCTION=true` is a deliberate public-demonstration opt-in. It prevents
fixture mode from becoming an accidental production fallback while still allowing the application
to be deployed safely before NBA.com connectivity has been verified.

### Deployment-host connectivity gate

Before enabling live data, run the connectivity gate from the deployed Render environment:

```sh
npm run connectivity-gate --workspace backend
```

Alternatively, after the backend has been built:

```sh
node backend/dist/scripts/nba-connectivity-gate.js
```

The gate probes only the four approved NBA.com endpoint families with a small sample:

- `commonallplayers`
- `commonplayerinfo`
- `playercareerstats`
- `playergamelog`

It prints a sanitized `PASS` or `FAIL` result for each endpoint and exits with a non-zero status
if any endpoint is blocked, challenged, times out, or returns an invalid response. It does not log
response bodies, request headers, cookies, or sensitive URL parameters.

### Enabling live mode

Only when all four connectivity checks pass:

1. Change `NBA_DATA_PROVIDER` to `nba-stats`.
2. Remove `NBA_ALLOW_FIXTURE_IN_PRODUCTION` or set it to `false`.
3. Keep `NBA_STATS_TIMEOUT_MS=10000` unless another valid timeout is intentionally selected.
4. Redeploy the service.
5. Repeat the production smoke tests.

If any connectivity check fails, keep:

```text
NBA_DATA_PROVIDER=fixture
NBA_ALLOW_FIXTURE_IN_PRODUCTION=true
```

The public application will remain fully usable with deterministic fixture data. The deployment
must clearly disclose that live NBA.com data is disabled because the hosting environment could
not reliably reach NBA.com. No blocking-evasion mechanism should be introduced.

Verified deployment outcome on 2026-06-22:

- The application deployed successfully to
  `https://nba-performance-explorer.onrender.com`.
- `/api/health`, player search, profiles, season statistics, game logs, career trends, and
  comparison were smoke-tested successfully in fixture mode.
- The deployment-host gate returned `PASS` for `commonallplayers`, `commonplayerinfo`,
  `playercareerstats`, and `playergamelog`.
- A subsequent `nba-stats` deployment started successfully, but real player search failed strict
  backend response validation with `PROVIDER_INVALID_RESPONSE` and HTTP 502.
- Production was rolled back to the explicitly approved fixture demonstration and is healthy.
- Live NBA.com data remains disabled pending a separately scoped response-validation
  investigation.

## Documentation

- [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md): product scope and definition of done.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): system boundaries and architecture rules.
- [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md): current implementation status.
- [`docs/DECISIONS.md`](docs/DECISIONS.md): architecture decision records.
- [`AGENTS.md`](AGENTS.md): repository working agreement.

## License

Not yet specified.
