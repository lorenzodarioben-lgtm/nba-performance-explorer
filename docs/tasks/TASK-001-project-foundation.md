# TASK-001 — Project Foundation

- **Milestone:** Phase 1 — Project Foundation
- **Status:** Completed
- **Branch:** `chore/project-foundation` (merged into `main` in merge commit `8bfdab2`)

> Read `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`, and `docs/PROJECT_STATE.md`
> before starting. Stay strictly within this task.

## Goal

Create a working frontend/backend development foundation that the rest of the project can be
built on. At the end of this task, a developer can clone the repo, install, and run both a
frontend and a backend locally, with the frontend successfully calling a backend health
endpoint — and all quality gates (lint, type check, tests, build) pass.

This task establishes plumbing only. It must **not** implement any product feature
(player search, player profiles, charts, comparison) and must **not** connect to a live NBA
API.

## In scope (expected work)

- **Establish the project structure.** Lay out the repository (for example a frontend
  workspace and a backend workspace) in a way consistent with `docs/ARCHITECTURE.md`.
- **Initialise React, Vite, and TypeScript** for the frontend.
- **Enable strict TypeScript** (frontend and backend). `strict` must be on.
- **Configure React Router** with a minimal route (for example a single home route). No
  feature routes.
- **Configure TanStack Query** (provider/client set up) so server state has its home.
- **Configure Tailwind CSS** and confirm it applies styles.
- **Create a minimal backend** in Node.js + TypeScript, serverless-compatible in shape.
- **Create a backend health endpoint** (for example `GET /api/health`) returning a small,
  structured, typed response (e.g. status and a timestamp).
- **Allow the frontend to display backend health status** by calling that endpoint through
  TanStack Query and rendering the result, including accessible loading and error states.
- **Add formatting and linting** (formatter + linter configured and runnable).
- **Add unit-test infrastructure** (Vitest + React Testing Library; Mock Service Worker
  available for mocking) with at least one real, meaningful test that runs in CI.
- **Add an environment-variable example file** (`.env.example`) documenting variable names
  with no real values.
- **Ensure real environment files are ignored** (verify `.env` is git-ignored and
  `.env.example` is tracked).
- **Add root validation commands** — single commands runnable from the repo root that run
  formatting check, lint, type check, tests, and build (for example `lint`, `typecheck`,
  `test`, `build`, and an aggregate `validate`).
- **Add a basic GitHub Actions validation workflow** that installs dependencies and runs the
  validation commands on push / pull request.
- **Document local setup** in `README.md` so the instructions match what actually works
  (install, run frontend, run backend, run validation, environment variables).

## Acceptance criteria

This task is done only when **all** of the following are true and have been actually
verified (not assumed):

- [ ] Frontend starts locally.
- [ ] Backend starts locally.
- [ ] The frontend can call the backend health endpoint and display its status.
- [ ] TypeScript strict mode is enabled.
- [ ] No API credentials exist anywhere in the repository.
- [ ] `.env` files and build outputs are git-ignored (and `.env.example` is tracked).
- [ ] Lint passes.
- [ ] Type checking passes.
- [ ] Tests pass.
- [ ] Production build passes.
- [ ] `README.md` contains accurate setup instructions that match the working project.

## Out of scope (explicitly excluded)

Do **not** do any of the following in this task:

- Player search.
- Player profile.
- Charts.
- Player comparison.
- External NBA API integration (no live NBA data source; fixtures only if any data is
  needed at all).
- Authentication.
- Deployment.
- Unrelated visual design work (no theming, branding, or design polish beyond what is
  needed to prove Tailwind and the health display work).

## Definition of done for this task

- All acceptance criteria above are checked and verified by actually running the commands.
- The complete git diff has been reviewed.
- `docs/PROJECT_STATE.md` is updated (status moves off "Not started" and the next action is
  set).
- Any significant decision taken while doing this task is recorded in `docs/DECISIONS.md`.
- No commit or push is made unless explicitly instructed.
