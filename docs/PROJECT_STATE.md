# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-20_

## Current state

- **Current milestone:** Phase 1 - Project Foundation
- **Current task:** TASK-001 - Project Foundation
- **Current status:** Complete, pending review
- **Current branch:** chore/project-foundation

## Summary

The npm workspace foundation is implemented with `frontend`, `backend`, and
`packages/contracts`. The React frontend checks `GET /api/health` through TanStack Query and
renders accessible loading, success, and error states. The Express 5 backend exposes the
validated health endpoint and structured 404, 405, and 500 responses. Both applications
use the same Zod schemas and inferred TypeScript types from the contracts workspace.

Verified on 2026-06-20 with Node.js 22.19.0 and npm 10.9.3:

- Formatting check passed.
- Lint passed.
- Strict type checking passed.
- Eight tests passed across the frontend and backend.
- Frontend and backend production builds passed.
- The root development command started both applications.
- The live frontend displayed the backend health response through the Vite `/api` proxy
  with no browser console warnings or errors.

## Immediate next action

Review the uncommitted TASK-001 changes. After they are accepted, define and activate the
next bounded task before beginning any TASK-002 implementation.

## How to update this file

After completing a task, update the fields above (milestone, task, status, branch), refresh
the summary to describe what now exists, and set the immediate next action to the following
task. Keep this honest - do not list features here that are not actually implemented.
