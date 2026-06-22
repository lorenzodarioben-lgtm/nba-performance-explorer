# NBA Performance Explorer

> **Status:** Functioning full-stack application with player search, profiles, selected-season
> statistics, career trends, game logs, and two-player comparison. A live NBA.com Stats provider
> (TASK-008) is implemented behind the backend provider boundary and selected with
> `NBA_DATA_PROVIDER`; fixtures remain the default for tests, CI, and offline use. This is an
> unofficial project (see "NBA.com Data Notice"). TASK-008 is completed and merged into `main`
> through pull request #9. Public production deployment and the deployment-host NBA.com
> connectivity gate remain unverified and have not been done.

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

- `NBA_DATA_PROVIDER=fixture|nba-stats` selects fixture or direct NBA.com Stats data. Absent
  outside production it defaults to `fixture`; tests and CI use `fixture` and never contact
  NBA.com.
- Production must explicitly select `nba-stats` (an absent or `fixture` value in production is a
  startup error); NBA.com failures never silently return fixture data.
- `NBA_STATS_TIMEOUT_MS` controls the live-provider request timeout: an integer from `1000`
  through `30000`, default `10000`. Invalid configuration fails before the server listens.
- NBA.com Stats requires no API key. No provider setting belongs in a `VITE_` variable.

Real `.env` files are ignored by Git. Example files contain non-secret values only.

## NBA.com Data Notice

This is an unofficial portfolio project and is not affiliated with, endorsed by, or sponsored by
the National Basketball Association. When the live provider is enabled
(`NBA_DATA_PROVIDER=nba-stats`), NBA statistics and data are sourced from NBA.com.

NBA.com Stats is undocumented and unsupported as a public API. Endpoint availability, schema
stability, historical correctness, uptime, and access from shared cloud-hosting networks are not
guaranteed. NBA.com terms may restrict public use of a comprehensive, regularly updated
statistics application and may require written permission. The project does not use proxies, IP
rotation, WAF bypasses, or other blocking-evasion techniques. Local connectivity does not
guarantee a deployed host can reach NBA.com: a deployment-connectivity gate must pass before live
mode is enabled in production. Fixture mode remains available for tests, CI, and offline
demonstrations.

## Documentation

- [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md): product scope and definition of done.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): system boundaries and architecture rules.
- [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md): current implementation status.
- [`docs/DECISIONS.md`](docs/DECISIONS.md): architecture decision records.
- [`AGENTS.md`](AGENTS.md): repository working agreement.

## License

Not yet specified.
