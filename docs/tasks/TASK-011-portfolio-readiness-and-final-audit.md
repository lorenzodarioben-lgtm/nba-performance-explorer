# TASK-011 - Portfolio Readiness and Final Production Audit

- **Milestone:** Portfolio Readiness
- **Status:** Stage C merged and deployed; Stage A implemented and validated locally on
  `docs/task-011-stage-a-readme`; Stages B and D pending
- **Current branch:** `docs/task-011-stage-a-readme`
- **Baseline main:** `1aa9c2e` (PR #15, `feat: polish production landing and browser metadata`)

> Read `AGENTS.md`, `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`,
> `docs/PROJECT_STATE.md`, and `docs/DECISIONS.md` before any work. TASK-001
> through TASK-010 are complete and merged. Production runs the live NBA.com provider.
> This task is a portfolio-readiness task only; it is not a feature expansion, provider
> change, or architecture change.

## Objective

Make the existing, working application recruiter-ready: an accurate, polished,
accessible, responsive, and demonstrably production-safe portfolio project. The public
README should explain the project quickly, while detailed implementation history remains
in `docs/`.

## Verified Starting State For Stage A

Verified before Stage A edits:

- Branch: `main`.
- Working tree: clean.
- `HEAD == origin/main == 1aa9c2ece4257701f1fd2466927051206c7fd22e`.
- PR #15 is merged into `main`.
- Stage C commits are included in `main`.
- No local TASK-011 feature branch remains.
- `render.yaml` remains live-backed:
  - `startCommand: node backend/dist/server.js`
  - `NBA_DATA_PROVIDER=nba-stats`
  - `NBA_ALLOW_FIXTURE_IN_PRODUCTION=false`
  - `NBA_STATS_TIMEOUT_MS=10000`
  - `FRONTEND_DIST=frontend/dist`
- No temporary diagnostic start command or diagnostic configuration exists.

Baseline validation on clean `main` before branching:

- `npm run validate` passed.
- Frontend tests: 147.
- Backend tests: 244.
- Total tests: 391.
- `git diff --check` passed.
- Automated tests remained offline and did not contact NBA.com.
- The known Vite/Recharts chunk-size warning remains non-blocking.

## Production State

Production: `https://nba-performance-explorer.onrender.com`

Production is live-backed through the backend `NbaStatsPlayerProvider`. The frontend
talks only to this project's Express API. No browser-side NBA.com requests are made, no
silent fixture fallback exists, and fixture mode remains the deterministic local/test/CI
default and documented production rollback.

## Completed Stage C - Production UX And Metadata

Stage C was merged in PR #15 at `1aa9c2e` and deployed through the normal `main` Render
flow. It changed frontend UX, metadata, tests, and task documentation only. It did not
change backend code, shared contracts, dependencies, `render.yaml`, or Render settings.

Stage C delivered:

- A finished product hero replacing the earlier foundation-style landing page.
- A small provider-neutral live-data service indicator.
- Provider-neutral empty-state wording in the game-log and comparison flows.
- Product browser metadata, Open Graph/Twitter metadata, and an original SVG favicon.
- Deterministic frontend tests, including metadata coverage.

The Stage C production smoke check confirmed the homepage and a player profile route load
in production.

## Upstream Empty-Career Limitation Found During Stage C Smoke

The Stage C smoke check also found a player-specific upstream empty-career response:
the profile route loaded, but season-backed views had no available seasons for one known
player ID. This was diagnosed with a bounded local comparison after PR #15 using the
production NBA.com HTTP client, the current production timeout, and the real
`playercareerstats` parser/mapper.

Sanitized structural results:

| Player ID | Expected result set | Header count | Raw row count | Parsed season count |
| --- | --- | ---: | ---: | ---: |
| `2544` | present | 27 | 0 | 0 |
| `201939` | present | 27 | 17 | 17 |

Confirmed facts:

- NBA.com returned a structurally valid `SeasonTotalsRegularSeason` result with zero rows
  for player ID `2544`.
- The same production client/parser path returned 17 rows and 17 parsed seasons for
  player ID `201939`.
- The mapper is not filtering out player ID `2544`; there were no rows to filter.
- No code, configuration, Git, or Render change was made during diagnosis.
- The upstream reason remains unknown.

Accepted interpretation:

- Treat player-specific upstream empty responses as an operational limitation of the
  undocumented NBA.com dependency.
- Do not add fallback data, special-case player IDs, alternate upstreams, proxies, retry
  loops, cache changes, or silent fixture behavior.
- The application should continue to return sanitized empty/error states.

No response bodies, raw rows, raw cell values, request headers, cookies, tokens, full
upstream URLs, query objects, or upstream error pages were recorded.

## Current Stage A Scope

Stage A is limited to README and repository presentation documentation.

In scope:

- Rewrite `README.md` as a recruiter-first overview of the live portfolio project.
- Remove stale fixture-only production wording, branch/PR progress notes, implementation
  chronology, obsolete TASK-009/TASK-010 status banners, stale test counts, and
  development-foundation wording from the public README.
- Keep setup, architecture, testing, deployment, operational limitations, attribution, and
  unofficial-project notice accurate.
- Record this Stage C merge/deployment state and the upstream empty-career limitation in
  project/task documentation.
- Record the Stage D screenshot plan without creating image files.

Out of scope for Stage A:

- Frontend or backend application code.
- Tests or production source behavior.
- Dependencies.
- `render.yaml`.
- Render settings.
- Provider, cache, diagnostics, retries, alternate data sources, or fallback behavior.
- Stage B accessibility/responsive/error-boundary work.
- Stage D final manual audit, screenshots, production smoke test, portfolio assets, resume
  bullets, and interview talking points.

## README Requirements

The README should be readable by a recruiter in roughly 30 seconds:

- Title and one-sentence value proposition.
- Prominent live-demo link.
- Short Render free-tier wake-up note.
- Project highlights focused on the strongest portfolio signals.
- Accurate technology stack from package manifests.
- Concise architecture explanation and, if useful, a small Mermaid diagram.
- Quality/testing section with 147 frontend tests, 244 backend tests, 391 total tests, and
  the canonical validation command.
- Fresh-clone local development instructions that match root scripts.
- Production configuration summary based on `render.yaml`.
- Honest operational limitations, including undocumented NBA.com behavior and
  player-specific empty upstream results.
- Compact repository structure.
- Links to deeper docs.

Do not add broken image references or fake screenshots. Since no committed screenshots
currently exist, keep screenshot details in this task document rather than cluttering the
public README.

## Stage A Implementation Status

Stage A is implemented locally on `docs/task-011-stage-a-readme`.

Done:

- Rewrote `README.md` as a recruiter-first overview with live demo link, project
  highlights, technology stack, concise architecture, validation counts, local
  development, production configuration, operational limitations, repository structure,
  and further documentation links.
- Removed public README chronology and obsolete production-status narrative.
- Kept screenshots out of the README because no committed screenshots exist yet.
- Updated `docs/PROJECT_STATE.md` and this task file for the PR #15 Stage C merge,
  deployed Stage C state, live-backed production configuration, and the accepted
  player-specific upstream empty-career limitation.
- Recorded the exact Stage D screenshot plan and recommended `docs/assets/` image
  directory without creating image files.

Verification:

- `npm run format` completed.
- No dedicated documentation or link-check script exists in the repository package
  scripts.
- `npm run validate` passed after edits.
- Frontend tests: 147.
- Backend tests: 244.
- Total tests: 391.
- `git diff --check` passed.
- Stale-content searches were reviewed.

No frontend/backend application code, tests, dependencies, `render.yaml`, provider code,
cache behavior, diagnostics, Render settings, or production configuration were changed.

## Historical Audit Findings

The original TASK-011 audit found these portfolio gaps:

- Landing page presentation, provider wording, and browser metadata needed production
  polish. **Resolved in Stage C.**
- The README was setup-oriented and too chronological for a recruiter. **Active in
  Stage A.**
- A top-level React error boundary and broader evidence-backed accessibility/responsive
  polish remain. **Deferred to Stage B.**
- Final validation, manual viewport/keyboard/contrast checks, production smoke testing,
  screenshots, and portfolio assets remain. **Deferred to Stage D.**

Existing quality signals to preserve:

- Accessible search combobox semantics and keyboard behavior.
- Career chart rendered with an equivalent semantic table.
- Semantic game-log and comparison tables.
- Shareable comparison URLs.
- Shared Zod public API contracts.
- Backend-private live provider details.
- Fixture-backed deterministic tests and CI.
- Sanitized provider errors and no silent provider fallback.

## Stage D Screenshot And Asset Plan

Recommended image directory: `docs/assets/`

Do not create image files during Stage A. Stage D should capture screenshots only after
rechecking live data immediately before capture. Use players whose live season data is
confirmed available at capture time; do not use any player whose career result is
currently empty.

Required Stage D capture candidates:

- Homepage hero: approximately `1440x900` or `1600x900`.
- Profile/statistics: approximately `1440x900`.
- Trends/game-log: approximately `1440x900`.
- Comparison: approximately `1440x900`.
- Optional narrow-mobile screenshot around `390px` wide.

Privacy and quality requirements:

- Crop out browser bookmarks, personal tabs, account avatars, tokens, dashboards, and
  unrelated windows.
- Never fabricate data or screenshots.
- Do not capture raw upstream responses, dashboards, secrets, cookies, headers, tokens,
  or local `.env` files.
- If an upstream live-data gap appears during capture, document it honestly and choose a
  different player only after confirming that player's live data is available.

Recommended Stage D capture set:

- Homepage hero.
- Stephen Curry profile and season statistics, if live season data is still confirmed
  available immediately before capture.
- Stephen Curry career trends and game log, if live season data is still confirmed
  available immediately before capture.
- Stephen Curry versus another player with confirmed common season data.
- Do not use LeBron James for screenshots while the upstream career result remains empty.

## Manual Verification Requirements For Stage D

Stage D must preserve the original manual audit scope. Do not claim these checks are done
until they are performed in a browser against the built or deployed application.

- Viewport checks around `360px`, `414px`, `768px`, `1024px`, and `1440px`, with no page
  horizontal overflow and wide tables scrolling only inside their intended regions.
- Keyboard-only checks for the player search combobox, including arrow-key movement,
  `Enter`, `Escape`, visible focus states, and recovery from empty or failed searches.
- Focus visibility checks for links, controls, table scroll regions, comparison controls,
  and any error or empty state actions.
- Contrast spot checks for lighter body text, metadata, chart labels, form labels, and
  disabled or secondary controls.
- Browser metadata checks for title, description, favicon, and social-preview metadata.
- Production smoke checks for `/api/health`, player search, player profile, available
  seasons, selected-season statistics, career trends, game log, comparison, direct-route
  refresh, sanitized empty/error states, and Render free-tier cold-start behavior.
- Portfolio-asset checks for final screenshots, concise project summary, resume bullets,
  and interview talking points.

## Pending Stages

### Stage B - Accessibility And Responsive Polish

Pending. Do not start during Stage A.

Expected scope: top-level error boundary, evidence-backed accessibility/responsive
polish, deterministic tests for any behavior touched, and clear separation between source
inspection and manual browser verification.

### Stage D - Final Audit And Portfolio Assets

Pending. Do not start during Stage A.

Expected scope: final validation, manual viewport/keyboard/contrast checks, production
smoke test, screenshots/portfolio assets, project summary, resume bullets, interview
talking points, and final documentation updates that distinguish automated checks from
manual verification.

## Stage A Validation Requirements

After editing:

1. Run formatting.
2. Run any documentation/link checks available in the repository.
3. Run `npm run validate`.
4. Run `git diff --check`.
5. Review the full diff.
6. Verify README test counts and commands against actual output and package scripts.
7. Search README and current-state docs for stale fixture-only production claims, old
   branch names, outdated commit hashes, stale test counts, and development-foundation
   wording. Report any remaining matches and whether they are legitimate.

## Stop Condition

Stop after Stage A is implemented, validated, reviewed, committed, pushed only when
explicitly approved, and prepared for pull-request review. Do not merge. Do not proceed
to Stage B or Stage D without explicit approval.
