# NBA Performance Explorer

> **Status:** Project foundation implemented. The repository currently provides a working
> frontend/backend development environment and health check only. Product features such as
> player search, profiles, charts, and comparisons have not been implemented.

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

The frontend and backend both import `HealthResponseSchema`, `HealthResponse`,
`ApiErrorResponseSchema`, and `ApiErrorResponse` from the contracts workspace. API schemas
are not duplicated between applications.

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

Real `.env` files are ignored by Git. Example files contain non-secret values only.

## Documentation

- [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md): product scope and definition of done.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): system boundaries and architecture rules.
- [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md): current implementation status.
- [`docs/DECISIONS.md`](docs/DECISIONS.md): architecture decision records.
- [`AGENTS.md`](AGENTS.md): repository working agreement.

## License

Not yet specified.
