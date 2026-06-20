# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-20_

## Current state

- **Current milestone:** Player Search Vertical Slice
- **Current task:** TASK-002 - Player Search
- **Current status:** Not started
- **Current branch:** feature/player-search

## Summary

TASK-001 is completed, reviewed, and merged into `main` in merge commit `8bfdab2`. The npm
workspace foundation includes `frontend`, `backend`, and `packages/contracts`. The React
frontend checks `GET /api/health` through TanStack Query, and the Express 5 backend exposes
the validated health endpoint and structured errors. Both applications use shared Zod
contracts.

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

Plan the implementation of TASK-002
(`docs/tasks/TASK-002-player-search.md`) before changing application code.

## How to update this file

After completing a task, update the fields above (milestone, task, status, branch), refresh
the summary to describe what now exists, and set the immediate next action to the following
task. Keep this honest - do not list features here that are not actually implemented.
