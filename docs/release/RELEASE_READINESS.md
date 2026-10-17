# Release readiness - NBA Performance Explorer 3.3

17 October 2026. **Verdict: READY WITH BLOCKERS for public deployment; draft review only.**
The design is finalized. Technical acceptance is recorded below; public distribution
is not cleared while rights and Render-host checks require owner review.

## Release identity and merge constraint

- Release PR branch: `release/nba-performance-explorer-3.3`.
- Original approved development branch: `codex/nba-explorer-final-polish`, preserved with
  its complete history. The neutral release uses a single snapshot parented by main;
  compare its full tree with the verified development tip before publication.
- Approved application/visual baseline: `8e2b38b6b3c5569c2700cd041bcb9b6d0e3818ce`.
- Fetched main: `cd557e4d3cf75e44f930ba75de4ea149a80ccdda`.
  At audit start: feature 132 ahead, main 0 ahead; no existing same-head/base PR.
- All approved application changes exist on the feature branch; this audit preserves
  frontend/backend implementation, assets, tests and development history.
- The draft PR is the final publication step after committing verification. Its URL,
  final tip, full-tree comparison and final-head CI are recorded in the delivery report
  and PR. The handoff describes the preserved source and publication sequence.
- GitHub allows squash merges; ordinary merge and rebase are also enabled. Auto-merge is off,
  and branch deletion on merge is off. No repository settings were changed.
- The draft uses `render-preview-skip`; a temporary title marker protects initial creation
  until the label is applied, before setting the exact requested release title. The Blueprint
  does not enable preview environments; dashboard settings remain an owner check.

**MERGE METHOD: SQUASH AND MERGE ONLY. This entire release must enter main as one new commit.**

Suggested squash title: `feat: release NBA Performance Explorer 3.3`.
Suggested description and feature summary: [release notes](RELEASE_NOTES_3.3.md).
Metadata, configured identity and preserved historical attribution:
[attribution review](ATTRIBUTION_REVIEW_3.3.md).

## Current release acceptance

| Check                             | Current audit result                                                                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Remote baseline CI                | Success on approved `8e2b38b`; fresh final-head CI recorded after push                                                                                                 |
| Full `npm run validate`           | Passed: 541 frontend tests (85 files), 532 backend tests (60 files), formatting/lint/types/assets and both builds; 0 lint errors, 13 existing warnings                 |
| Separate visual asset integrity   | Passed: 401 files, 73 players, 45 team marks, 604 archive and 653 franchise-record team-seasons                                                                        |
| Full desktop/mobile `npm run e2e` | Passed: 242 unique checks, 78 intentional skips; 157 initial passes plus 85 connection-refused cases rerun successfully after restarting local servers                 |
| Production-mode built-app smoke   | 15/15 passed: genuine live provider, static/SPA checks, desktop/mobile keyboard flow, fixture guards and separately simulated upstream outage                          |
| Controlled live Stats gate        | 4/4 passed today: directory/search, profile, career and game log, current production parsers, 10000ms timeout, no retries                                              |
| Dependency vulnerabilities        | `npm audit --json`: 0; `npm audit --omit=dev --json`: 0                                                                                                                |
| Secret-pattern review             | 715 tracked text files and feature-history patches: no tested credential patterns; built client: no patterns or public source maps; only two example env files tracked |
| Existing public health            | One read returned 200; this does not establish its deployed SHA or 3.3 readiness                                                                                       |

Current commands run on Windows, Node 22.19.0/npm 10.9.3. Browser checks use Chromium with
desktop/mobile emulation; Safari, Firefox, physical devices and Render resource capacity are
not certified. Full validation and browsers run sequentially to avoid host-load timing failures.
No fixture-backed browser result is described as live NBA.com evidence. The local production
smoke selects `NODE_ENV=production`, `NBA_DATA_PROVIDER=nba-stats`, fixtures false, same-origin
built frontend and `WIKI_ARCHIVE_MODE=live`; a separate injected outage is labelled simulated.

Verification evidence: [validation and browser completion](evidence/RELEASE_33_VALIDATION.json).
The initial browser run lost its local servers after 157 successes; all 85 failed cases
were `page.goto` connection-refused errors. Only those cases were resumed with `--last-failed`;
all 85 passed, with zero overlap in successful case identities and no changed assertions.

Production evidence: [15-check report](evidence/RELEASE_33_SMOKE.json),
[desktop](evidence/production-home-1440.png), [mobile](evidence/production-home-390.png),
and [security/configuration record](evidence/RELEASE_33_SECURITY.json). Live API acceptance
returned one player match, 23 career seasons and 71 games for 2023-24. The current schedule
returned a valid empty date (zero games), rather than invented scores; historical standings
and a Wikidata season returned valid source-labelled data. Render-host availability remains
unverified. No in-progress game, live scoring update, live box score or live play-by-play was
available in that response for acceptance; their fixture/archive tests do not establish live
connectivity. The new smoke harness initially typed behind a closing search dialog; it now
waits for exit and asserts focus restoration before typing, matching the existing browser
workflow. Its final run passes with no production page or console errors. No application
code or existing test assertion changed.

## Security and configuration findings

- Production provider omission fails startup. Fixture mode requires an explicit production
  demonstration override, disabled by the release blueprint. Live failures do not switch it on.
- Same-origin static/API serving; no permissive cross-origin response headers configured.
  Public research endpoints are read-only; this is not an authenticated personal-data server.
- Upstream calls use fixed application-controlled source URLs, input validation, timeouts,
  bounded caches and in-flight deduplication. Stats cache: 500 entries; live NBA cache: 80.
  Directory/profile TTLs are 24h/6h; current logs 5m; schedule 10m, scoreboard 20s. Research
  source work has a three-request budget. This is not a public load-test certification.
- Upstream failures have stable 502/503/504 codes and generic client messages. Diagnostics are
  opt-in and sanitized. Unexpected errors can log server-side stacks; restrict log access.
- No `dangerouslySetInnerHTML` use was identified. User research/imports are schema-validated;
  text is escaped, external source links are application/record-controlled, and exports have
  CSV/SVG protections. The secret review is pattern-based, not a guarantee against every format.
- No source-map emission is enabled in Vite. Static hosting returns the SPA for unknown
  non-API GET paths; a guessed `.env` URL does not make an ignored environment file public.
- No new dependency, production configuration, route, UI or architecture change is required
  by the findings so far. The opt-in smoke script adds release evidence only.

## Deployment and publication blockers

1. **Rights/publication:** unresolved licences for professional photographs, NBA.com headshots,
   NBA/team marks and NBA.com-derived data. Known Wikipedia/CC0 provenance is separate.
   Preserve attribution; owner must resolve [the rights review](RIGHTS_REVIEW_3.3.md).
2. **Render confirmation:** actual dashboard branch/auto-deploy mode, compatible patched Node 22,
   build-time dependency installation and environment overrides were not independently read.
   Confirm them before merging; laptop connectivity does not prove Render-host NBA connectivity.
   The latest GitHub deployment record inspected is historical (4 July 2026, ref
   `feature/production-deployment`, SHA `00cf13bc57611a8a57ffacc3075e2c30ad06fe2b`),
   rather than evidence of the current dashboard branch or deployed commit.
3. **Deployment approval:** `render.yaml` has `autoDeploy: true`. With its reported main linkage,
   the eventual squash merge can immediately deploy 3.3. Draft creation and feature-branch pushes
   do not alter main. No deployment or preview is requested by this task.

The blueprint still uses `npm ci && npm run build`, `node backend/dist/server.js`,
`FRONTEND_DIST=frontend/dist`, `/api/health`, live provider and fixtures disabled. Health is
liveness, not source readiness. Its older successful gate comments are historical evidence,
not proof of today's Render connectivity. Free-tier cold starts, ephemeral caches and limited
rollback retention require planning. See [deployment and rollback](DEPLOYMENT_RUNBOOK.md).

Technical approval does not replace the publication decision. Keep the PR draft, retain all
feature commits, and have the owner approve rights, Render settings, release timing and the
single squash merge. No approval is supplied on the owner's behalf.

---

## Historical 3.2 readiness record (preserved; not current results)

# Release readiness — NBA Performance Explorer 3.2

**Verdict: READY WITH DOCUMENTED LIMITATIONS.** The release candidate is complete, tested and
demonstrable; its limits are data-scope limits stated below. It has **not** been merged or
deployed. Publishing the NBA.com-derived data is an open owner decision
([deployment runbook §0](DEPLOYMENT_RUNBOOK.md)).

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
with the code: a digest-pinned NBA.com league archive of 43 seasons (1983–84 to 2025–26, about
21 MB), the reconciled 2023–24 Wikipedia team pages, a structured snapshot of the 2024 playoff
and 2023–24 season tables, the 2018 shot archive with NBA.com's league zone baseline, and the
honours file (award winners agreed by NBA.com and Wikipedia). NBA.com is called by the backend
only, on request and cached, for player research, live games, play-by-play, lineups and on/off. Personal research lives in browser storage,
validated and size-bounded.

## Feature families

Playoffs (bracket, series film room, game pages), seasons (standings race, recorded rankings,
leaders, records, calendar, history), teams (season intelligence, roster/results panel, duel),
players (NBA.com rooms; recorded 2023–24 rooms), labs (workbench, Shot Studio, lineups,
analytics, formula lab), compare (comparison studio, comparison lab, similarity finder,
discovery), My NBA (saved research, collections, stories, motion, import/export), data coverage
(`/explore/coverage`), tour and global search. New in 3.2: the scoreboard and game pages with
box scores and play-by-play, season-aware standings and leaders, team pages for any season,
record book, leader movement, eras, player record rooms, NBA.com lineups and on/off, champions
and awards, the shot league baseline and a live source status board. Original specification
closeout: **134 of 134 verified** within stated scopes (3.1: 87 / 33 / 13 / 1;
[matrix](FINAL_FEATURE_MATRIX.md)).

## Test results (final run)

| Gate                                                | Result                                                                                                                                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prettier, ESLint, module-case check, TypeScript     | Pass (ESLint: 0 errors, 13 pre-existing react-refresh warnings)                                                                                                               |
| Frontend unit/UI tests (Vitest)                     | **488 passed** of 488 (77 files)                                                                                                                                              |
| Backend and contract tests (Vitest, Supertest)      | **531 passed** of 531 (60 files)                                                                                                                                              |
| Production build (contracts, frontend, backend)     | Pass                                                                                                                                                                          |
| Browser suite (`npm run e2e`, Playwright, Chromium) | **217 passed, 0 failed, 73 skipped**: desktop 1440×900 and mobile 390×844 smoke on every route; axe scans run once at desktop width, so their mobile instances skip by design |
| `npm audit` / `npm audit --omit=dev`                | 0 / 0 vulnerabilities                                                                                                                                                         |

3.2 final run, 2026-10-16, on Windows 11, Node 22.19.0, with the development servers on
5173/3001: one uninterrupted `npm run validate` passed (exit 0). Two earlier full runs failed
only on timeouts under host load; the second exposed a real cost (champions derived on every
request), fixed in `2daf98e` ([log](../expansion5/EXECUTION_LOG.md)). CI on GitHub runs the same
`npm run validate`.

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
- Network: the live NBA.com client builds URLs only for `cdn.nba.com` and `stats.nba.com` from
  fixed paths and validated IDs, with one timeout and no retries; the browser makes no
  third-party requests (verified with all external requests blocked). Build scripts contact
  Wikipedia, Wikidata and NBA.com only when run by hand, spaced and cached.
- Repository fix: the test-coverage ignore rule had hidden `backend/src/features/coverage`,
  so a clean clone could not build; fixed in `36ecae3`.

## Local demonstration readiness

- `scripts/start-presentation.ps1` builds if needed, starts the production server, waits for a
  real health check and opens http://localhost:4310/; `scripts/stop-presentation.ps1` stops it.
  Both exercised on this Windows machine.
- Verified offline (3.2, port 4320): archive, recorded, shot and story features and every 3.2
  archive page work with every outbound request failing; NBA.com player pages, live games,
  play-by-play, lineups, current standings, the Wikidata history pages, awards and draft show
  their unavailable states, and the status board reports them as unavailable. Procedure and route: [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md).

## Production build readiness

- `npm run build` succeeds; the compiled backend serves the built frontend, static assets, lazy
  chunks and deep links (70 routes audited at desktop and mobile width on the local production
  server in 3.2: no overflow, page or console errors; only the expected bundled-mode awards and
  draft states).
- The build copies all 133 digest-pinned league data files and the shot baseline into
  `backend/dist` (checked). On start-up the server derives the champions and the record book in
  the background, yielding between seasons.
- `render.yaml` unchanged and compatible: build `npm ci && npm run build`, start
  `node backend/dist/server.js`, health `/api/health`. The committed snapshots are emitted into
  `backend/dist` by the TypeScript build (checked).
- No new required environment variables. Optional: `WIKI_ARCHIVE_MODE=bundled`.

## External dependency risks

| Dependency       | Risk                                                                                                                  | Effect if unavailable                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| NBA.com Stats    | Undocumented; may block or slow cloud IPs (timed out from this host in earlier sessions, answered at the final check) | Player pages show "unavailable"; archive features unaffected                                  |
| NBA.com CDN      | Undocumented; may change format or block cloud IPs                                                                    | Scoreboard, play-by-play, lineups and live standings show "unavailable"; status board says so |
| Wikipedia        | Rate limits, article edits that break strict parsing                                                                  | Falls back to the committed snapshot, labelled                                                |
| Wikidata         | Availability                                                                                                          | `/history` navigator and awards/draft unavailable; identity links already committed           |
| Render free tier | ~50 s cold start, memory limits                                                                                       | Slow first load                                                                               |

## Known limitations

- Live features depend on NBA.com answering from the host; not yet checked from Render.
- Play-by-play from 1996–97, ratings and possessions from 1996–97, lineups and on/off from
  2007–08; 11 seasons are team-only because their box scores do not add up.
- Honours cover seven individual awards; Eddie Johnson's 1988–89 Sixth Man award is a
  documented gap (NBA.com lists no awards for him).
- NBA.com data is used under the owner's accepted risk; no licence is held
  ([data integration report](../expansion5/DATA_INTEGRATION_REPORT.md)).
- Position filters use the positions each 2023–24 team page lists; 11 qualified players have no
  listed position and appear only without a position filter.
- Player leader labels link only on exact names (411 of 492); surname-only ties stay text.
- Stories and saved research are per browser; there are no accounts or sync by design.
- Shot Studio's events cover 80 of the 82 games of the 2018 playoffs (not Finals Games 3–4);
  its league baseline covers all 82.

## Go / no-go

**Go for owner review.** No critical blockers. Before merging, the owner should: decide whether
NBA.com-derived data is published, run the demo once, open the pull request and wait for CI,
and after deploy check NBA.com availability on the Render host
([DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md)).

Unresolved items (none blocking): the stated data scopes above and the pre-existing 13 lint
warnings (react-refresh export rule, no errors).
