# Architecture — NBA Performance Explorer

> Status: Initial development. This describes the intended architecture. Most of it is not
> implemented yet. Coding agents must read this before making structural changes and must
> not violate the boundaries described here.

## Overview

The system is a single-page frontend talking to our own backend API. The backend, in turn,
talks to an external NBA data source through a replaceable data-provider abstraction. The
frontend never talks to an external NBA data source directly, and never sees external API
credentials.

```
Browser (React SPA)
      │  calls our own backend only
      ▼
Backend API (Node.js, serverless-compatible)
      │  uses a data-provider interface
      ▼
Data Provider (fixture/mock now; live NBA source later)
```

## Frontend architecture

- **Framework:** React with TypeScript, built with Vite.
- **Routing:** React Router. Routes represent the core journey (search, player profile,
  comparison). Shareable state (selected player, season, comparison) is expressed through
  the route and URL search parameters so that any view can be reproduced from its URL.
- **Server state:** TanStack Query manages all data fetched from our backend (caching,
  loading, error, and refetch behaviour).
- **Styling:** Tailwind CSS, with a responsive, mobile-first approach.
- **Charts:** Recharts for interactive visualisations.
- **Validation:** Zod validates data crossing trust boundaries (for example, parsing
  responses from our backend into typed domain models on the client where appropriate).
- **Structure:** Code is organised by feature/domain rather than by file type, with shared
  UI primitives and a clear place for domain models, API client code, and hooks.

React components must not consume raw external API responses. Components consume internal
domain models only (see "Internal domain-model boundary").

## Backend architecture

- **Runtime:** Node.js with TypeScript.
- **Shape:** Serverless-compatible. Endpoints are written so they can run as serverless
  functions or behind a small server, without assuming a long-lived stateful process.
- **Responsibilities:** Expose our own API to the frontend, call the data provider, map
  provider responses into internal domain models, validate data at runtime, apply caching,
  and return structured errors.
- **Runtime validation:** Incoming and outgoing data is validated (Zod or equivalent) at
  the boundary; the backend does not trust the shape of external responses.
- **Structured errors:** Errors are returned in a consistent, typed shape (for example a
  stable error code, a human-readable message, and an HTTP status) so the frontend can
  render accessible error states predictably.
- **Caching:** Responses from the data provider are cached to reduce load on the upstream
  source and improve latency. Cache strategy is an implementation detail behind the
  backend API.

## Data-provider abstraction

The backend depends on a **data-provider interface**, not on any specific NBA data source.

- The interface defines the operations the backend needs (for example: find players,
  fetch a player's seasons, fetch season statistics, fetch a game log).
- Concrete implementations satisfy that interface. The first implementation reads from
  **fixture / mock data**. A live NBA source can be added later as another implementation
  with no change to the backend's callers.
- Provider-specific response shapes never leak past the provider. Each provider maps its
  own raw responses into internal domain models before returning them.
- The provider is selected by configuration, so swapping fixtures for a live source is a
  configuration and wiring change, not a rewrite.

This keeps the project from being coupled to one NBA data source.

## State-management responsibilities

State is deliberately partitioned so there is one obvious home for each kind of state:

- **Server state → TanStack Query.** Anything fetched from our backend lives in TanStack
  Query's cache.
- **Local component state → React state.** Ephemeral UI state (open menus, input values
  before submit, hover, etc.) uses React's own state.
- **Shareable filters → URL search parameters.** Selected player(s), season, and comparison
  state live in the URL so views are shareable and reproducible.

Rules:

- Do **not** introduce Redux.
- Do **not** introduce Zustand unless a real, persistent client-state need actually appears
  and is documented as a decision first.

## Internal domain-model boundary

There is a hard boundary between external/provider data shapes and the internal domain
models the application uses:

- External provider responses are **mapped** to internal domain models. The rest of the
  system — backend business logic and the entire frontend — speaks only in domain models.
- React components must **never** consume raw external API responses.
- The frontend communicates only with our own backend API; it never calls an external NBA
  source directly.
- Domain models are defined once and shared in spirit across the boundary (the frontend's
  models reflect what our backend returns, validated at runtime).

This boundary is what makes the data provider replaceable and the UI stable.

## Security requirements

- API credentials and secrets must **never** appear in frontend code or in the committed
  repository.
- All access to credentialed external sources happens in the backend.
- Secrets are supplied through environment variables at runtime. A committed
  `.env.example` documents which variables exist, with **no real values**.
- Real `.env` files are git-ignored.
- The backend returns structured errors and does not leak provider internals or secrets in
  error messages.

## Testing approach

- **Unit and component tests:** Vitest with React Testing Library.
- **Network mocking:** Mock Service Worker (MSW) to simulate backend responses in tests so
  the frontend can be tested without a running backend or live data.
- **End-to-end:** Playwright will be added later for critical end-to-end flows (the core
  user journey). It is not required for the foundation.
- Tests are part of the definition of done and run in CI. A claim that tests pass must be
  backed by an actual run.

## Intended deployment shape

- The frontend builds to static assets and is served from static hosting / a CDN.
- The backend runs as serverless-compatible functions.
- Public deployment is a later milestone; it is not part of the foundation task. The
  architecture is chosen so deployment does not require Kubernetes, a microservices
  topology, or any always-on cluster.
