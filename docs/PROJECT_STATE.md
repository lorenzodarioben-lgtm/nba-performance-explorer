# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-06-21_

## Current state

- **Current milestone:** Player Search Vertical Slice
- **Current task:** TASK-002 - Player Search
- **Current status:** Implemented and verified; pending independent review
- **Current branch:** feature/player-search

## Summary

TASK-002 implements fixture-backed player search across the existing workspaces. Shared
Zod contracts define team and player summaries. The Express backend validates search
queries, uses a replaceable fixture provider, maps provider records to internal models,
sorts deterministically, and returns no more than eight results. The React frontend uses a
debounced TanStack Query hook and an accessible combobox/listbox to support keyboard and
pointer selection into the bounded `/players/:playerId` placeholder route.

Automated validation re-run on 2026-06-21 with Node.js 22.19.0 and npm 10.9.3 against the
current working tree (`npm run validate` plus each step individually):

- Formatting (`format:check`) passed; `format` reported no changes.
- Lint passed.
- Strict type checking passed.
- Thirty-five tests passed: 20 frontend and 15 backend.
- Frontend and backend production builds passed.
- `npm run validate` passed end to end and `git diff --check` reported no issues.

Live manual verification on 2026-06-21 with the backend on `http://localhost:3001` and the
Vite dev server on `http://localhost:5173` (using the `/api` proxy):

- Backend health renders "Backend status: ok"; the health error state also rendered when
  the page loaded before the API was ready.
- Direct backend requests against the real fixture provider confirmed: missing, blank,
  one-character, and repeated `search` parameters return the shared structured HTTP 400;
  surrounding whitespace is trimmed; matching is case-insensitive; no-match returns an
  empty list; "an" returns exactly eight deterministically ordered players; POST returns
  405; and no provider-private fixture fields appear in responses.
- In the browser: search runs only at two or more trimmed characters, results render name,
  team, and position, the empty state announces "No players found.", combobox/listbox ARIA
  semantics are correct (`aria-expanded`, `aria-controls`, `aria-activedescendant`,
  `aria-selected`), ArrowDown/ArrowUp move and wrap the highlight, the highlight is visible,
  Escape closes the list without reopening from cache, and both mouse click and Enter
  navigate to `/players/:playerId`. The bounded placeholder and its return link work, and
  the layout holds at a 375px mobile width with a clean browser console.
- The player-search loading state and the 500/invalid-contract error states are not
  conveniently reproducible against the always-healthy local fixture server; they are
  covered by the automated MSW frontend tests.

## Immediate next action

TASK-002 is implemented and verified on `feature/player-search` with all changes
uncommitted. Review the complete TASK-002 diff and, once approved, commit it on this branch.
Do not begin the full player-profile work (a future task) yet.

## How to update this file

After completing a task, update the fields above (milestone, task, status, branch), refresh
the summary to describe what now exists, and set the immediate next action to the following
task. Keep this honest - do not list features here that are not actually implemented.
