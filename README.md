# NBA Performance Explorer

> ⚠️ **Status: Initial development.** This repository currently contains **project planning
> and documentation only**. There is no application to run yet — no frontend, no backend,
> and no installed dependencies. Nothing below describes working features; it describes what
> the project is *intended* to become. Do not treat any feature as implemented until
> `docs/PROJECT_STATE.md` says so.

## What this will be

NBA Performance Explorer is a planned responsive web application for searching NBA players,
examining player performance across seasons, viewing calculated insights and interactive
charts, and comparing two players. The intended core journey is: search for a player →
open their profile → pick a season → view key stats, trends, and a game log → pick another
player → compare them → share the URL.

For the full product definition, see [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md).

## Current status

- **Milestone:** Phase 1 — Project Foundation
- **Active task:** TASK-001 — Project Foundation (not started)
- **What exists today:** planning and agent-workflow documentation only.

The authoritative, up-to-date status is always in
[`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md).

## Planned stack

Nothing here is installed yet; this is the approved direction.

**Frontend:** React, TypeScript, Vite, React Router, Tailwind CSS, TanStack Query,
Recharts, Zod.

**Backend:** Node.js, TypeScript, serverless-compatible, with a replaceable data-provider
abstraction, runtime validation, structured errors, and caching.

**Testing:** Vitest, React Testing Library, Mock Service Worker; Playwright later for
critical end-to-end flows.

## Documentation

| Document | Purpose |
| --- | --- |
| [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md) | Product statement, target user, core journey, MVP, non-goals, definition of done. |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Frontend/backend architecture, data-provider abstraction, state management, domain-model boundary, security, testing, deployment shape. |
| [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) | Live project status and the immediate next action. |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architecture decision records (ADRs). |
| [`docs/tasks/`](docs/tasks/) | Bounded task definitions, starting with TASK-001. |
| [`AGENTS.md`](AGENTS.md) | Working agreement that every coding agent must follow. |

## Getting started

There is no setup yet because no application exists. Local setup instructions (installing
dependencies, running the frontend and backend, and environment variables) will be added as
part of **TASK-001 — Project Foundation**, and this section will be updated to match what is
actually runnable at that point.

## Contributing / working in this repo

All work follows the agreement in [`AGENTS.md`](AGENTS.md): read the spec, architecture,
project state, and the active task file first; stay within the active task; keep TypeScript
strict; never expose secrets; verify formatting, linting, type checking, tests, and the
build before claiming completion; and never commit or push unless explicitly instructed.

## License

Not yet specified.
