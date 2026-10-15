# Release readiness — NBA Performance Explorer 3.0

**Verdict: READY WITH DOCUMENTED LIMITATIONS.** The release candidate is complete, tested and
demonstrable; its limits are data limits stated below. It has **not** been merged or deployed.

## Identity

| Item                    | Value                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| Branch                  | `claude/nba-explorer-3-expansion` (pushed to `origin`)                                    |
| Release-candidate HEAD  | see `git log -1` on the branch; the final commit of this report is listed in `HANDOFF.md` |
| Base of the public site | `main` at `cd557e4` (ancestor of this branch; 3.0 is unmerged)                            |
| Protected branches      | `main`, `codex/nba-explorer-2-engine`, `claude/nba-explorer-design`: untouched            |

## Architecture in one paragraph

An npm-workspaces monorepo: React 19 + Vite frontend, Express 5 backend and a shared Zod
`contracts` package that validates every request and response on both sides. In production one
Node process serves the API and the built SPA (with deep-link fallback). Historical data ships
with the code: the reconciled 2023–24 Wikipedia team pages, a structured snapshot of the 2024
playoff and 2023–24 season tables, and the 2018 shot archive. NBA.com Stats is called by the
backend only, on request, for player research. Personal research lives in browser storage,
validated and size-bounded.

## Feature families

Playoffs (bracket, series film room, game pages), seasons (standings race, recorded rankings,
leaders, records, calendar, history), teams (season intelligence, roster/results panel, duel),
players (NBA.com rooms; recorded 2023–24 rooms), labs (workbench, Shot Studio, lineups,
analytics, formula lab), compare (comparison studio, comparison lab, similarity finder,
discovery), My NBA (saved research, collections, stories, motion, import/export), tour and
global search. Original specification closeout: 83 verified, 37 partial, 13 blocked, 1 deferred
of 134 ([matrix](FINAL_FEATURE_MATRIX.md)).

## Test results (final run)

| Gate                                                | Result                                                                                                                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prettier, ESLint, module-case check, TypeScript     | Pass (ESLint: 0 errors, 13 pre-existing react-refresh warnings)                                                                                                                  |
| Frontend unit/UI tests (Vitest)                     | **448 passed** of 448 (67 files)                                                                                                                                                 |
| Backend and contract tests (Vitest, Supertest)      | **457 passed** of 457 (48 files)                                                                                                                                                 |
| Production build (contracts, frontend, backend)     | Pass                                                                                                                                                                             |
| Browser suite (`npm run e2e`, Playwright, Chromium) | **169 passed, 0 failed, 57 skipped**: desktop 1440×900 and mobile 390×844 smoke on every route; axe scans run once at desktop width, so their 57 mobile instances skip by design |
| `npm audit` / `npm audit --omit=dev`                | 0 / 0 vulnerabilities                                                                                                                                                            |

Run on Windows 11, Node 22.19.0, with the development servers on 5173/3001. On this heavily loaded
host the first full `npm run validate` runs failed only by timing (different tests each run,
each passing alone); the recorded run passed format, lint, module-case and typecheck, then tests
and build were re-run on their own and passed. CI on GitHub runs the same `npm run validate`.

## Accessibility

- Playwright axe checks (serious and critical violations) on every route in `e2e/routes.ts`,
  desktop and mobile, including the film room (two routes), stories and the tour.
- Manual axe runs on every new interaction state (film room selected game, story editor and
  reader, collections, comparison scales, workbench picks). Two contrast failures were found and
  fixed this session (red "clinched" text at 4.41:1; earlier sessions' similar cases).
- Keyboard: the film room tape is one tab stop with arrow/Home/End; story sections reorder with
  buttons that keep focus on the moved control; region selection has a numeric keyboard route;
  every chart has a table alternative; reduced motion is honoured and user-selectable.

## Security

- `npm audit`: 0 vulnerabilities; `npm audit --omit=dev`: 0.
- No secrets in tracked files (only `.env.example` files with non-secret defaults).
- Strict query validation on every new endpoint (400 malformed, 404 unknown, 405 wrong method),
  repeated parameters rejected.
- Browser storage: stories, saved research and collections are schema-validated on every read
  and write, bounded (stories 300,000 characters, research 100,000), with prototype-key refusal
  on JSON import; share links are size-capped and validated; reader text is rendered as text.
- Exports: CSV cells neutralise spreadsheet formulas; SVG exports insert text as text nodes.
- No new network permissions: the backend calls only the existing allow-listed Wikipedia pages,
  Wikidata and NBA.com endpoints; the browser makes no third-party requests (verified with all
  external requests blocked).

## Local demonstration readiness

- `scripts/start-presentation.ps1` builds if needed, starts the production server, waits for a
  real health check and opens http://localhost:4310/; `scripts/stop-presentation.ps1` stops it.
  Both exercised on this Windows machine.
- Verified offline: archive, recorded, shot and story features work with every outbound request
  failing; NBA.com player pages, the Wikidata history pages, awards and draft show their
  unavailable states. Procedure and route: [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md).

## Production build readiness

- `npm run build` succeeds; the compiled backend serves the built frontend, static assets, lazy
  chunks and deep links (20 routes loaded and refreshed on the local production server).
- `render.yaml` unchanged and compatible: build `npm ci && npm run build`, start
  `node backend/dist/server.js`, health `/api/health`. The committed snapshots are emitted into
  `backend/dist` by the TypeScript build (checked).
- No new required environment variables. Optional: `WIKI_ARCHIVE_MODE=bundled`.

## External dependency risks

| Dependency       | Risk                                                                                                                  | Effect if unavailable                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| NBA.com Stats    | Undocumented; may block or slow cloud IPs (timed out from this host in earlier sessions, answered at the final check) | Player pages show "unavailable"; archive features unaffected                        |
| Wikipedia        | Rate limits, article edits that break strict parsing                                                                  | Falls back to the committed snapshot, labelled                                      |
| Wikidata         | Availability                                                                                                          | `/history` navigator and awards/draft unavailable; identity links already committed |
| Render free tier | ~50 s cold start, memory limits                                                                                       | Slow first load                                                                     |

## Known limitations

- No live or current data, upcoming games, play-by-play, possessions, ratings, on/off, injuries
  or league-wide shot baselines (see the matrix's "What prevents 100%").
- One fully recorded season (2023–24); 2022–23 failed its integrity audit and is not shipped.
- Player leader labels link only on exact names (411 of 492); surname-only ties stay text.
- Stories and saved research are per browser; there are no accounts or sync by design.
- Shot Studio covers part of the 2018 playoffs (ends June 3, before the Finals).

## Go / no-go

**Go for owner review.** No critical blockers. Before merging, the owner should: run the demo
once, open the pull request and wait for CI, and after deploy check NBA.com availability on the
Render host ([DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md)).

Unresolved items (none blocking): the PARTIAL/BLOCKED requirements listed in the matrix and the
pre-existing 13 lint warnings (react-refresh export rule, no errors).
