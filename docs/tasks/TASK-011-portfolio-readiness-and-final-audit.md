# TASK-011 — Portfolio Readiness and Final Production Audit

- **Milestone:** Portfolio Readiness
- **Status:** Definition complete; implementation not started
- **Branch:** `chore/portfolio-readiness-audit`

> Read `AGENTS.md`, `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`, and
> `docs/DECISIONS.md` before any work. TASK-001 through TASK-010 are complete and merged; production
> runs the live NBA provider. This document defines scope and a staged plan from an evidence-based
> audit. It changes no application code. Committed repository files are authoritative wherever this
> document conflicts with them.

## Objective

Make the existing, working application **recruiter-ready**: an accurate, polished, accessible,
responsive, and demonstrably production-safe portfolio piece. This is **not** a feature expansion or
architecture change. The application already works end-to-end on live NBA.com data; the gaps are in
presentation (landing page, README, metadata), a few stale strings, and final accessibility/
responsive verification.

## Verified starting state

- `main` clean and synchronized with `origin/main` at `3e1d2ad` (PR #14 merge).
- Baseline `npm run validate` passes: Prettier check, ESLint, strict type checking, **139 frontend
  and 244 backend tests (383 total)**, and the production build (with the known Recharts/Vite
  "chunk larger than 500 KB" warning — the JS bundle is ~714 KB raw / ~213 KB gzip). `git diff --check`
  is clean.
- No real `.env` is tracked (only `.env.example`); no `console.*` in non-test frontend source.

## Production state (in repository)

`render.yaml` (source of truth, matches the verified Render dashboard):

- `startCommand: node backend/dist/server.js`
- `NBA_DATA_PROVIDER=nba-stats`
- `NBA_ALLOW_FIXTURE_IN_PRODUCTION=false`
- `NBA_STATS_TIMEOUT_MS=10000`, `FRONTEND_DIST=frontend/dist`

TASK-010 Stage E verified all eight flows live; production serves `provider: nba-stats`. Documented
rollback: `NBA_DATA_PROVIDER=fixture` + `NBA_ALLOW_FIXTURE_IN_PRODUCTION=true`.

## Audit methodology

Static, evidence-based review of the committed source and tests (no Render changes, no live-network
automated tests). Each area below was inspected directly: `index.html`, `App.tsx`, `main.tsx`,
`styles.css`, every feature component and its tests, the CI workflow, lint/format/type configs, and
`render.yaml`. Visual rendering, real keyboard behaviour, contrast, and a production smoke test
require **manual browser verification** and are listed as such — they are not claimed as verified.

## What is already strong (preserve — do not regress)

These are quality signals to keep and to showcase, not to change:

- **Accessible search combobox** (`PlayerCombobox.tsx`): `role="combobox"`, `aria-autocomplete`,
  `aria-expanded`/`aria-controls`/`aria-activedescendant`, full keyboard nav (arrows/Enter/Escape),
  labeled `listbox`/`option`s, and `status`/`alert` live regions.
- **Accessible charting** (`PlayerCareerTrends.tsx`): the Recharts chart is `aria-hidden` and the
  same data is rendered in a semantic `<table>` (caption, `scope` headers); line styles **and**
  legend shapes vary (not colour-only); animation is disabled.
- **Semantic tables** with keyboard-focusable horizontal-scroll regions (`PlayerGameLog.tsx`,
  `PlayerComparisonTable.tsx`), `<dl>` stat cards, heading-focus management on SPA navigation
  (`PlayerProfilePage.tsx`, `PlayerComparisonPage.tsx`), and sanitized error states throughout.
- **Shareable URL state** for comparison; **clean CI** (Node 22, `npm run validate`, offline,
  minimal permissions); no secrets, no `console` output, no tracked `.env`.

## Prioritized findings

Severity: **Blocker** / **High** / **Medium** / **Low**. Each lists evidence, affected files,
recommended fix, effort (S/M/L), and whether manual visual verification is required.

### High

1. **Landing page reads as an unfinished developer scaffold.**
   - Evidence: `FoundationPage.tsx` — eyebrow text literally `Project foundation` (line ~16) and a
     backend **health-check debug widget** ("Checking backend status…", "Backend status: ok",
     "Service: nba-performance-explorer-api", lines ~33–55). No value proposition, no statement that
     the app uses real NBA data.
   - Affected: `frontend/src/features/foundation/FoundationPage.tsx`,
     `frontend/src/features/foundation/FoundationPage.test.tsx`, possibly
     `frontend/src/features/foundation/useHealthQuery.ts` and `api.ts` (if the health widget is
     removed). Consider renaming `foundation/` to a `home/` feature, or keep the path and restyle.
   - Fix: replace the "Project foundation" framing with a real hero (product name + one-sentence
     value proposition + "uses live NBA.com data" note + the search as the primary call to action);
     remove or repurpose the raw health-check widget (health stays a backend concern, not public UI).
   - Effort: M. Manual visual verification required.

2. **Stale "fixture-backed" wording in four user-facing strings (incorrect in live mode).**
   - Evidence: `PlayerGameLog.tsx:114` ("No fixture-backed games are available…");
     `PlayerComparisonPage.tsx:242/249/256` ("…has no fixture-backed regular-season data…").
   - Affected: those two components and their tests (`PlayerGameLog.test.tsx:228`,
     `PlayerComparisonPage.test.tsx:385`).
   - Fix: neutral wording (e.g. "No regular-season games are available for the {season} season",
     "{name} has no regular-season data to compare"); update the assertions.
   - Effort: S. No manual verification beyond a test run.

3. **README is developer-setup-oriented, not recruiter-first; no visual preview.**
   - Evidence: `README.md` leads with prerequisites/installation; it has an accurate live-status
     banner (added in TASK-010 Stage E) but **no screenshots**, no tight feature list, no
     at-a-glance stack/architecture/testing summary, and a long implementation-history feel.
   - Affected: `README.md` (and new image assets under `docs/` or `frontend/public/`).
   - Fix: recruiter-first structure (hero screenshot, one-line value prop, prominent live-demo link,
     concise features/stack/architecture/testing/limitations, then collapsed setup); deep history
     stays in the `docs/tasks/` files.
   - Effort: M. Requires screenshots (manual capture).

### Medium

4. **`index.html` metadata is stale and incomplete.**
   - Evidence: `index.html` — `meta description` is "Development foundation for NBA Performance
     Explorer."; **no favicon** (no `frontend/public/` dir, no `<link rel="icon">`); no Open Graph /
     Twitter social-preview tags.
   - Affected: `frontend/index.html`, a new `frontend/public/` (favicon + optional OG image).
   - Fix: product description; add a favicon; add OG/Twitter tags for link previews.
   - Effort: S. Manual check of the browser tab/social preview recommended.

5. **No top-level React error boundary.**
   - Evidence: `main.tsx` renders `<App/>` with no error boundary; a render-time throw in any
     feature would blank the page.
   - Affected: `frontend/src/main.tsx` (or a new `ErrorBoundary` component) and a test.
   - Fix: add a minimal, accessible top-level error boundary with a friendly recovery message.
   - Effort: S–M.

6. **Production bundle exceeds the 500 KB warning threshold (~714 KB raw), driven by Recharts.**
   - Evidence: `npm run build` Vite warning; `recharts` is the dominant dependency.
   - Affected: `frontend/src/features/players/PlayerProfilePage.tsx` /
     `PlayerCareerTrends.tsx` (lazy boundary), `vite.config.ts` (optional manual chunking).
   - Fix (optional, only if clearly valuable): lazy-load the chart so Recharts is fetched on the
     profile route rather than in the initial bundle; or adjust the warning limit with justification.
   - Effort: M. Measure before/after; do not over-engineer.

### Low

7. **Default `QueryClient`** (`main.tsx`) — no `staleTime`; live data refetches on remount. A modest
   `staleTime` would reduce live NBA requests. Effort: S.
8. **"Inter" font referenced but not loaded** (`styles.css`) — falls back to system fonts. Cosmetic.
9. **Catch-all route** renders the landing page for any unknown path (no distinct not-found view).
   Acceptable, but a light "not found" affordance would be cleaner. Effort: S.

## Exact scope

In scope: content/presentation fixes (landing hero, stale strings, README, metadata/favicon),
a minimal error boundary, evidence-backed accessibility/responsive polish, optional justified
performance work, screenshots/portfolio assets, and a manual production smoke test. All changes
preserve the current visual identity (zinc/red palette, left-border accents, system font) and the
existing architecture and contracts.

## Explicit non-goals

- No new product features (no new endpoints, pages, stats, or providers).
- No architecture or data-flow redesign; no change to the `PlayerProvider` boundary or shared
  contracts.
- No backend/parser changes, no `render.yaml` provider change, no Render setting change.
- No dependency additions without justification recorded in `docs/DECISIONS.md`.
- No speculative redesign, animation systems, or design-system refactor.
- No live-network calls in automated tests.

## Implementation stages

### Stage A — README and repository presentation
- Recruiter-first README: hero screenshot, one-line value proposition, prominent live-demo link,
  "uses live NBA.com data" statement, concise features / stack / architecture / testing / known
  limitations sections, then collapsed local-setup.
- Verify setup steps from a clean checkout (or document each verified step).
- Keep deep implementation history in `docs/tasks/`; link to it rather than inlining it.

### Stage B — Accessibility and responsive polish
- Fix only evidence-backed issues; preserve the strong existing patterns.
- Add the top-level error boundary (finding 5).
- Add deterministic tests where practical (error boundary, neutral empty-state strings, any
  semantics change). Identify what still needs manual browser verification.

### Stage C — Production UX and metadata
- Landing hero + removal/repurposing of the health-check widget (finding 1).
- Replace the four stale "fixture-backed" strings (finding 2) and update their tests.
- `index.html` metadata, favicon, and social-preview tags (finding 4).
- Confirm direct-route refresh and SPA fallback behaviour (existing backend `app-static` tests cover
  static serving; confirm the SPA fallback path for `/players/:id` and `/compare`).
- Cold-start messaging only if justified (free-tier spin-down + live fetch latency).

### Stage D — Final audit and portfolio assets
- Full `npm run validate` + `git diff --check`.
- Manual viewport checklist and a production smoke test of all flows.
- Capture the required screenshots (or provide an exact capture checklist if a browser is
  unavailable in the implementation session).
- Produce a concise portfolio summary, resume bullets, and interview talking points.
- Final documentation update (`PROJECT_STATE.md`, this task doc) distinguishing automated checks from
  manual verification.

## Accessibility requirements

- Preserve the combobox, chart-as-table, semantic-table, and focus-management patterns.
- Every interactive control keeps a visible focus state and an accessible name/label.
- Tables keep `caption` + `scope` headers; charts keep a textual/tabular equivalent.
- Loading/empty/error states keep `status`/`alert` live regions; error text stays sanitized.
- One `<h1>` per route; logical heading order.
- No new colour-only information. Do not claim WCAG conformance without a measured audit; record
  contrast spot-checks as evidence where claims are made.

## Responsive-design requirements

- Manually verify representative widths (~360 px, ~414 px, ~768 px, ~1024 px, ~1440 px): search
  controls, profile header, stat cards, chart, game-log table, comparison controls/table.
- No page-level horizontal overflow at ~360–375 px (tables scroll within their own region).
- Adequate tap targets and spacing; readable chart at small widths.
- Do not claim a responsive layout is verified unless it was actually inspected.

## README requirements

- Accurate live-production status and a prominent, correct live-demo link.
- No stale fixture-only or pre-merge wording in public-facing docs.
- Hero + at least one feature screenshot; concise feature/stack/architecture/testing sections;
  known operational limitations (free-tier cold start; NBA.com terms / possible IP blocking;
  rollback to fixture).
- Setup steps that work from a fresh clone (or are explicitly verified step by step).
- Environment-variable documentation kept accurate.

## Production smoke-test requirements

Against the live deployment, verify (sanitized — no raw upstream data): `/api/health`; player
search; player profile; available seasons; selected-season statistics; career trends; game log;
two-player comparison; a direct-route refresh; and at least one sanitized error/empty state. Record
the cold-start behaviour.

## Screenshot and portfolio-asset requirements

- Hero (landing with search), player profile (with stat cards + chart), career trends / game log,
  and comparison table.
- Suggested dimensions: ~1280×800 (or 2× for retina) desktop; optionally ~390×844 mobile.
- Decide whether a short GIF/video of the search→profile→compare flow adds value.
- An architecture diagram (Browser → Express → PlayerProvider → fixture|nba-stats) is recommended for
  the README.
- Provide a concise project summary, resume-ready bullets, and interview talking points
  (live undocumented-API integration; sanitized diagnostics; evidence-driven debugging; accessible
  charting; provider abstraction). Do not fabricate screenshots or claim assets exist when they do not.

## Deterministic testing requirements

- All tests stay offline; none contacts NBA.com.
- Add/adjust tests for: the neutralized empty-state strings; the error boundary; and any semantics
  change. Keep the existing flow/state/error tests green.
- Keep documented test counts accurate after changes.

## Manual verification checklist (cannot be asserted from source alone)

- [ ] Visual layout at ~360/414/768/1024/1440 px (no horizontal overflow; legible chart/tables).
- [ ] Keyboard-only: combobox arrows/Enter/Escape; focus visibility on inputs, links, scroll regions.
- [ ] Browser tab shows title + favicon; social-preview renders.
- [ ] Production smoke test of all flows on the live deployment, including a direct-route refresh.
- [ ] Cold-start experience after free-tier spin-down.
- [ ] Contrast spot-checks for the lighter text tones used on white.

## Acceptance criteria

1. Repository starts from clean synchronized `main`; baseline validation passes before implementation.
2. README accurately reflects live production with a prominent, correct live-demo link.
3. No stale fixture-only or pre-merge wording remains in public-facing documentation **or UI strings**.
4. Setup instructions work from a fresh clone or are explicitly verified step by step.
5. Major flows have clear loading, empty, success, and sanitized error states.
6. Keyboard navigation and focus behaviour verified for interactive controls.
7. Major layouts manually checked across representative viewport widths.
8. Tables/controls use appropriate semantics; charts retain meaningful textual context.
9. No secrets or raw upstream data appear in the repository or logs; diagnostics off by default; no
   silent fixture fallback; no browser-side NBA.com requests.
10. No live-network calls added to automated tests.
11. `render.yaml` and documented production configuration remain aligned (live provider).
12. Formatting, lint, strict type checking, tests, build, and `git diff --check` pass.
13. Production health, search, profile, statistics, trends, game log, and comparison are smoke-tested.
14. Required screenshots are captured or an exact capture checklist is provided.
15. Portfolio summary, resume bullets, and interview talking points are produced.
16. No unrelated architecture change or feature expansion is introduced.
17. Final documentation distinguishes automated checks from manual verification.

## Rollback / safety constraints

- Do not change the production provider, `render.yaml` env values, or any Render setting as part of
  this task; production stays live-backed. The documented fixture rollback remains available if
  NBA.com becomes unreachable, but invoking it is out of scope here.
- Frontend/content changes deploy via the normal `main` flow (auto-deploy); review the diff before
  merge. Any regression can be reverted with `git revert`.

## Completion evidence

Validation output and counts; `git diff --check`; the manual viewport/keyboard checklist results;
the production smoke-test record; the captured screenshots (or the capture checklist); and the
portfolio summary / resume bullets / talking points.

## Files likely to change

- `README.md`; `frontend/index.html`; `frontend/public/*` (new favicon/OG image);
  `frontend/src/features/foundation/*` (landing hero; possibly renamed to `home/`);
  `frontend/src/features/players/PlayerGameLog.tsx` (+ test);
  `frontend/src/features/player-comparison/PlayerComparisonPage.tsx` (+ test);
  `frontend/src/main.tsx` / a new `ErrorBoundary` (+ test); optionally `frontend/src/styles.css`,
  `frontend/vite.config.ts` (lazy chunking); `docs/PROJECT_STATE.md`, this task doc, and possibly new
  `docs/` image assets and `docs/DECISIONS.md` (only if a dependency or notable decision is added).
- **No** backend, shared-contract, or `render.yaml` changes are expected.

## Risks and open questions

- **Manual verification gap:** responsive, keyboard, contrast, and smoke-test claims need a real
  browser; if the implementation session lacks one, those items must be explicitly deferred with a
  precise checklist, not claimed.
- **Landing-page restructure scope:** removing the health widget and renaming `foundation/` touches a
  tested module; keep the change minimal and update tests rather than expanding scope.
- **Screenshots depend on live data**, which is subject to NBA.com availability; capture during a
  healthy window.
- **Bundle optimization** must show measurable value or be left as a documented Low item.
- **Open question:** should the public landing keep any (sanitized) "system status" affordance, or
  drop it entirely in favour of a pure product hero? (Recommendation: drop the raw widget; rely on
  the backend health check, which stays internal.) — **Resolved in Stage C:** kept a small,
  unobtrusive, accessible service-status line with user-facing wording (no raw service identifier),
  because it doubles as useful free-tier cold-start feedback.

## Implementation Status — Stage C (2026-06-24)

Stage C (Production UX and Metadata) is **implemented and committed locally**. Stages A, B, and D
remain **pending**.

Done in Stage C:

- Replaced the "Project foundation" landing scaffold and the raw backend health-check debug panel
  with a product hero (one `<h1>`, value proposition, the search as the primary action, a
  capabilities list, an honest unofficial/NBA.com attribution note). Retained a small, accessible
  service-status line ("Connecting to live data" / "Live data service available" / "Live data
  service temporarily unavailable") that never exposes the internal service identifier.
- Removed the four stale "fixture-backed" user-facing strings (`PlayerGameLog.tsx`,
  `PlayerComparisonPage.tsx` ×3) and updated their tests.
- `index.html`: product title/description, `theme-color`, Open Graph and Twitter card metadata
  (production URL; no `og:image` yet), and an original SVG basketball favicon in `frontend/public/`.
- Added landing-page tests and a deterministic `index.html` metadata test.

Verification: `npm run validate` passes (139→**146 frontend** and 244 backend, **390 total**);
`git diff --check` clean. A repository search confirms no user-facing `fixture-backed`,
`Project foundation`, `Development foundation`, dev/placeholder, or `console.` wording remains in
frontend production code (only test assertions verifying their absence, the accessible season-select
placeholder option, and the search input `placeholder` attribute).

Still pending (not done in Stage C):

- **Manual browser viewport confirmation (~360/768/1024/1440 px)** — the layout was verified
  statically (no fixed widths; `max-w-3xl`; responsive grids; wrapping heading) but **not** visually
  confirmed in a browser. Likewise keyboard-only navigation, the rendered favicon/social preview,
  contrast spot-checks, and a production smoke test remain for Stage D / a session with browser
  tooling.
- The social-preview `og:image` (Stage D), the README rewrite (Stage A), the top-level error
  boundary and broader a11y/responsive polish (Stage B), and the portfolio assets/summary (Stage D).
- The `docs/PROJECT_STATE.md` "Summary" section's TASK-009-era fixture wording (Stage A
  documentation-accuracy pass).

Production was **not** touched (no Render or `render.yaml` change); production remains **live-backed**
(`provider: nba-stats`). The frontend change will deploy via the normal `main` auto-deploy once this
branch merges; until then production is unchanged.
