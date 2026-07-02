# Project State - NBA Performance Explorer

> This file is the live status of the project. It must be updated after every completed
> task. Coding agents read this to understand where things stand before starting work.

_Last updated: 2026-07-02_

## Current State

- **Current milestone:** Visual Redesign 2 - Broadcast Editorial
- **Current task:** Whole-application audit fixes and release polish (complete; checkpoint committed, not pushed)
- **Current branch:** `feature/visual-redesign-2-foundation`
- **Current status:** A second, approved visual redesign has now redesigned every route into a dark,
  premium basketball editorial and broadcast experience, evolving the merged Stage 1-3 light
  "data-terminal" system. Four stages are complete and committed on
  `feature/visual-redesign-2-foundation` (not pushed, no PR): the dark landing plus the global dark
  shell and self-hosted type system; the fully dark player profile (identity hero, biography, dark
  season selector, scoreboard statistics, and supporting dark stat sheet); the profile's remaining
  data surfaces - the career trend chart and its equivalent table, and the game log and its scrollable
  table - redesigned dark with the temporary light contrast band removed; and the two-player
  comparison route (`/compare`), redesigned as a dark cinematic head-to-head with equally prominent
  id-mapped player panels and a neutral, accessible comparison table. A whole-application adversarial
  audit then ran across every route, and its approved findings were fixed in a final release-polish
  stage: the landing's Career Trends section (the last light band) is now dark, so the app is dark
  from beginning to end; the landing heading now takes focus on entry like the other routes; the
  mobile menu traps keyboard focus; large red display figures (jersey numbers, the "VS") use a
  brighter display-red for contrast while the single UI accent is unchanged; the comparison
  Replace/Clear/Cancel actions have larger touch targets; the career-trends equivalent table is a
  named focusable scroll region; and visible em-dashes and repeated landing eyebrows were cleaned up.
  Validation passes with 166 frontend tests, 244 backend tests, and 410 total. Backend, shared
  contracts, routes, `render.yaml`, all data/query/season/comparison logic, the chart and game-log
  data and metric definitions, and the numeric formatters are unchanged, and production configuration
  is untouched. The branch has not been pushed; the portfolio screenshots under `docs/assets/` still
  show the previous light design and must be refreshed to the dark UI before release. The prior
  redesign and TASK-011 remain recorded below.

## Visual Redesign 2 (Broadcast Editorial)

An approved second redesign evolves the identity surfaces into a dark, broadcast-editorial
basketball experience while the data views stay legible and are redesigned later. The direction is
recorded in ADR-015 (dark direction), ADR-016 (self-hosted Saira Condensed + JetBrains Mono under the
SIL Open Font License 1.1), ADR-017 (supplied editorial photography used as isolated, replaceable
project imagery), ADR-018 (dark player profile with strict id-keyed imagery and a photo-free
fallback), ADR-019 (dark career trends and game log with a data-visualisation chart palette), and
ADR-020 (dark cinematic comparison route with equally prominent id-mapped player panels and a
neutral, accessible comparison table), and ADR-021 (final release polish: dark landing end to end, a
display-only brighter-red token, and accessibility parity fixes).

Landing stage (this checkpoint, on `feature/visual-redesign-2-foundation`):

- A dark token layer (`night`, `coal`, `chalk`) added alongside the existing light tokens; red
  `#b91c1c` remains the single accent, and the blue focus ring and green live-status are unchanged.
- A self-hosted condensed display face (Saira Condensed) and a technical mono (JetBrains Mono),
  declared with `font-display: swap`, with the two hero display weights preloaded.
- A fixed dark masthead with a full-screen mobile menu, and a dark editorial footer that keeps the
  non-affiliation notice present and readable.
- A full-screen hero built around a player photograph (masked so it dissolves into the page), a
  giant layered condensed headline, the integrated dark-tone player search, and the live-data
  status; followed by a broadcast ticker, a profiles section, a light career-trends contrast band,
  a two-player "VS" teaser, and a closing call to action - every section maps to a real feature.
- A CSS + IntersectionObserver motion system (hero line and image reveals, scroll reveals, one
  ticker, court-line draw-in), fully gated on `prefers-reduced-motion` with the global guard as a
  backstop; no animation dependency was added.

All existing accessibility contracts are preserved: the accessible search combobox and its keyboard
behaviour, route heading focus, the semantic chart-equivalent table and non-colour-only series,
sanitized loading/empty/error states, and the single visible focus ring. The landing `<h1>` text,
the search's accessible name, the capabilities copy, and the "Compare two players" link are
unchanged, so the frontend test suite passes without modification.

Player-profile stage (this checkpoint, on `feature/visual-redesign-2-foundation`):

- The player profile now continues the dark experience: a full-bleed identity hero, the biography as
  broadcast technical labels, a dark season selector, points/rebounds/assists as oversized scoreboard
  figures, and the supporting statistics as a calm dark stat sheet with hairline separators (no white
  cards). The non-success states (loading, invalid link, not found, error) are rebuilt dark.
- Editorial player photography is mapped strictly by NBA person id
  (`frontend/src/features/players/playerImages.ts`). A mapped player gets a masked full-bleed hero; a
  player without a mapping gets an intentional photo-free dark composition (typography, the
  jersey-number scoreboard graphic, a red broadcast glow, a court-line motif, and the real data). The
  wrong player's photograph is never shown.
- At that checkpoint the career trend chart, its equivalent table, and the game log were deferred
  inside a temporary light contrast band; they are now redesigned dark in the following stage. Every
  statistic value, number format, season-selection ownership, query keys, `<dl>`/`<dt>`/`<dd>`
  semantics, the accessible "Season" select, the region and its states, and heading focus are
  preserved, so the frontend test suite passes without modification. Recorded in ADR-018.

Career-trends and game-log stage (this checkpoint, on `feature/visual-redesign-2-foundation`):

- The career-trends section, its Recharts chart, and the accessible chart-equivalent table are
  redesigned dark, and the temporary light contrast band is removed, so the profile is dark end to
  end. The game-log section and its horizontally scrollable table are redesigned dark, with their
  loading, empty, error, and unavailable states.
- The three chart series are lightened as data-visualisation colours - points bright red (`#f87171`),
  rebounds light blue (`#60a5fa`), assists warm amber (`#fbbf24`) - chosen to read clearly on the
  near-black chart panel and to stay distinct from the single red UI accent, the blue focus ring, the
  green live-status, and the grid. The three-way series encoding is preserved: the dash patterns
  (solid, `6 3`, `2 4`), the legend marker shapes (circle, square, triangle), and the equivalent
  table. Red remains the single UI accent outside the chart.
- All protected behaviour is preserved: chart data and transforms, metric definitions, game-log data
  and formatting, the numeric formatters, query ownership and keys, season selection, table captions
  and scoped headers, the chart `aria-hidden` plus equivalent-table pattern, the W/L fill-versus-
  outline badge, tabular numerals, the named keyboard-focusable horizontal scroll region, the state
  messages and roles, and reduced-motion behaviour. Recorded in ADR-019.

Comparison stage (this checkpoint, on `feature/visual-redesign-2-foundation`):

- The two-player comparison route (`/compare`) is redesigned as a dark cinematic head-to-head, the
  last route to leave the light Stage 1-3 system. Every route now renders on the dark `night` canvas
  (the per-route light exception is removed), and the comparison page bleeds under the fixed masthead.
- The composition is a player-versus-player hero: two equally prominent, identically treated identity
  panels flanking an oversized red "VS". A confirmed panel is a masked, scrimmed player photograph
  with a red jersey-number scoreboard figure, the player name as a condensed link to the profile, and
  team / position / season technical labels; a player without an id-mapped photograph gets an
  intentional photo-free dark composition, so the wrong player's photograph is never shown. The
  player-search comboboxes use the existing dark tone and the season selector uses the dark field
  styling.
- The comparison table stays neutral and authoritative: both player columns receive identical
  typography, colour, weight, and spacing, with only a single thin neutral divider between them and no
  winner colouring, arrows, or better/worse implication. The selected season is added to each column
  header and remains in the caption.
- All protected behaviour is preserved: the duplicate-player handling, the common-season intersection
  logic, and the shareable comparison URL state (`comparison-state.ts`); query ownership and keys; the
  combobox keyboard and ARIA model (only its tone changes); season reconciliation; comparison metrics
  and number formatting; route definitions; the table caption, scope, and semantics; the named
  keyboard-focusable horizontal scroll region; route heading focus; the accessible combobox names; the
  single blue focus ring; and all duplicate, loading, unavailable, no-common-season, invalid, empty,
  and error messages and roles. Motion (the VS pop, the staggered panel rise, and the image settle) is
  CSS-only and gated on `prefers-reduced-motion`. Recorded in ADR-020.

Final release-polish stage (this checkpoint, on `feature/visual-redesign-2-foundation`):

- After the four dark stages, a whole-application adversarial audit reviewed every route by source,
  the test suite, and a live fixture-backed preview. Its approved findings were then fixed here; no
  data, logic, contracts, or routes changed.
- The landing Career Trends section, the last light band, is converted to the dark system (a charcoal
  surface, warm-white type, red accent, dark court-line motif, and a restrained red glow for depth).
  The application is now dark from beginning to end.
- Accessibility parity: the landing `<h1>` now receives focus on entry like the profile and
  comparison routes; the mobile navigation dialog traps Tab and Shift+Tab and restores focus to the
  toggle on close; the career-trends equivalent table is a named, keyboard-focusable scroll region
  (`role="group"`, `aria-label`, `tabindex=0`) consistent with the game-log and comparison tables; the
  comparison Replace/Clear/Cancel actions get practical touch targets; and the comparison player-name
  link gets a persistent resting underline.
- A display-only brighter-red token (`--color-accent-bright`, #ef4444) is introduced for large
  scoreboard figures (jersey numbers and the "VS") on dark surfaces, reaching about 5:1; the deeper
  `--color-accent` remains the single UI accent for links and controls.
- Copy and rhythm cleanup: visible em-dashes removed from the page title and landing copy, the
  landing section eyebrows reduced to two, the redundant rotated hero label removed, and the dead
  `hero-title` class removed.
- Focused tests were added for the landing heading focus, the mobile-menu focus containment and
  restoration, and the named career-trends scroll region (166 frontend, 244 backend, 410 total).
  Recorded in ADR-021. The `docs/assets/` portfolio screenshots still show the previous light design
  and remain to be refreshed to the dark UI before release.

## Visual Redesign (Stages 1-3)

A three-stage visual redesign moved the app from a default-Tailwind appearance to a precise
sports-reference / data-terminal visual system, with no change to routes, APIs, the backend,
shared contracts, the provider, query/cache behaviour, dependencies, or Render configuration:

- **Stage 1 (PR #20, `8f35d42`):** a CSS design-token layer, deliberate system typography (the
  unshipped Inter declaration removed), a shared application header and footer, the homepage
  recomposition and search presentation, and the error-boundary alignment.
- **Stage 2 (PR #21, `5926f6c`):** the data surfaces - player profile and metadata, season
  selector and statistics hierarchy (headline stat tiles plus a dense secondary grid), the
  framed career chart and its equivalent table, the game-log table, and the neutral two-player
  comparison - all restyled to the Stage 1 system with every value and semantic preserved.
- **Stage 3 (this branch):** responsive and state-presentation consistency, a thin on-brand
  horizontal-scroll affordance for the dense tables, an explicit reduced-motion guard, mobile
  chart-axis clarity, and documentation/test-total updates (160 frontend, 244 backend, 404
  total).

The five portfolio screenshots under `docs/assets/` have been refreshed from the final
redesigned application using deterministic local fixture data. The README screenshot captions
now describe the refreshed Stephen Curry and LeBron James `2023-24` fixture comparison.

## Summary

TASK-001 through TASK-010 are complete and merged. The application is deployed at
`https://nba-performance-explorer.onrender.com` as a single Render web service: Express
serves the built React SPA and the `/api` routes from one origin.

The product supports the core journey end to end:

- Search NBA players.
- Open a player profile.
- View available seasons and selected-season statistics.
- Explore career trends through an accessible chart with an equivalent semantic table.
- View selected-season game logs.
- Compare two players through shareable URLs.

The backend uses a replaceable `PlayerProvider` boundary. The live provider uses the
approved NBA.com Stats endpoint families (`commonallplayers`, `commonplayerinfo`,
`playercareerstats`, and `playergamelog`) through a backend-only HTTP client, strict
response parsing, shared public contracts, process-local caching, sanitized provider
errors, zero automatic retries, and no silent fixture fallback. Fixture mode remains the
default for local development, tests, CI, offline use, and explicitly approved rollback
demonstrations.

TASK-011 Stage C changed only frontend UX, browser metadata, tests, and task
documentation. It did not change backend code, shared contracts, dependencies,
`render.yaml`, or Render settings. The deployed Stage C production smoke check confirmed
that the homepage and a player profile route load in production.

TASK-011 Stage A rewrote the public README for recruiter-facing presentation and was
merged to `main` at `56a740e`. Stage B was merged to `main` in PR #17 at `fc83a78`; it
changed only frontend root/error-recovery code, the game-log table scroll container,
frontend tests, and task/state documentation. Stage D changed only documentation, five
screenshot assets under `docs/assets/`, and the README visual section; it did not change
frontend or backend application code, shared contracts, dependencies, provider logic,
cache behavior, diagnostics, `render.yaml`, Render settings, or production configuration.

Stage B audit summary:

- Preserved existing accessible player combobox behavior, route-heading focus, sanitized
  loading/error states, native season selectors, semantic game-log and comparison tables,
  career chart table equivalence, and non-colour-only chart series patterns.
- Added a top-level React error boundary around the app root so unexpected render-time
  errors below the root show a concise recovery screen instead of a blank page.
- Fixed the confirmed game-log scroll-region issue by giving the horizontally scrollable
  table container an accessible group name, keyboard focus, and visible focus styling.
- Attempted browser viewport tooling, but it did not initialize before navigation. Stage B
  therefore used static source/CSS inspection plus deterministic tests; visual viewport,
  keyboard, and contrast checks remain Stage D manual work.

Stage D audit summary:

- Verified the live production deployment through the application's own public `/api`
  routes (bounded, no direct NBA.com calls): health, player search, profile, available
  seasons, selected-season statistics, game log, career trends, and a two-player
  comparison (Stephen Curry `201939` and Kevin Durant `201142`, common season `2025-26`)
  all returned live data; direct profile and `/compare` refreshes returned the SPA shell;
  the unknown-route catch-all returned the SPA. Player ID `2544` still returned zero career
  seasons, re-confirming the documented upstream empty-data limitation (not an application
  defect).
- Captured five live-production screenshots in a real browser (home, profile, career
  trends, comparison, and a narrow mobile home) and integrated them into the README under
  `docs/assets/`.
- With a source/CSS review of every route and the 398 deterministic tests, the audit
  confirmed no page-level horizontal overflow on the captured desktop and mobile layouts,
  correct mobile single-column collapse, semantic tables with captions and scoped headers,
  the chart's equivalent table and non-colour-only series, route heading focus, the
  accessible search combobox, and the keyboard-focusable named table scroll regions. No
  frontend visual or accessibility defect was confirmed, so no application code changed;
  the only correction was the stale README test counts (147/391 to 154/398).

Stage D verification scope and honest limitations:

- Screenshots were captured at approximately `1359x904` (desktop) and `348x800` (mobile);
  the capture pipeline downscaled them from the nominal `1440x900` and ~`390px` targets,
  and the intermediate widths (`414`, `768`, `1024`) were not separately captured.
  Responsive behavior at those widths is supported by the source/CSS review and the
  desktop and mobile captures, not by per-width browser captures.
- Keyboard interaction, focus-ring visibility, and colour-contrast values are supported by
  the source review and the deterministic tests (accessible combobox keyboard handling,
  heading focus, visible focus styles, sanitized states), not by separate browser-tool
  measurements in this pass. No WCAG-compliance claim is made.

The same Stage C smoke check discovered a player-specific upstream empty-career response.
A bounded local diagnostic used the production NBA.com HTTP client, production timeout,
and the real career parser/mapper without editing code, changing Git, changing
configuration, or touching Render. Sanitized structural results:

- Player ID `2544`: expected `SeasonTotalsRegularSeason` result set present, 27 headers,
  0 raw rows, 0 parsed seasons.
- Player ID `201939`: expected `SeasonTotalsRegularSeason` result set present, 27
  headers, 17 raw rows, 17 parsed seasons.

Confirmed: the mapper is not filtering out player ID `2544`; the empty public seasons
result comes from a structurally valid upstream response with zero career rows. The
upstream reason remains unknown. This is documented as an operational limitation of the
live NBA.com dependency, not a code defect. No fallback data source, proxy, retry loop,
special-case player ID, cache change, diagnostics toggle, or Render change is authorized
for this incident.

## Validation State

Before TASK-011 Stage B work began, clean `main` at
`56a740ee62a5a8f93e03f00b32f869a83cff913b` was validated with:

- `npm run validate` passing.
- Frontend tests: 147.
- Backend tests: 244.
- Total tests: 391.
- `git diff --check` passing.
- Shared contracts, frontend, and backend production builds passing.
- The known Vite/Recharts chunk-size warning remaining non-blocking.
- Automated tests remaining offline and not contacting NBA.com.

After the Stage B implementation, validation passed locally with:

- Focused frontend tests for `AppErrorBoundary` and `PlayerGameLog`: 19 passing.
- Full frontend tests: 154 passing.
- Backend tests: 244 passing.
- Total tests: 398 passing.
- `npm run validate` passing.
- Shared contracts, frontend, and backend production builds passing.
- The known Vite/Recharts chunk-size warning remaining non-blocking.
- Automated tests remaining offline and not contacting NBA.com.

Stage D changed documentation, five `docs/assets/` screenshots, and the README visual
section only; no application code changed, so the test counts are unchanged. Validation on
the Stage D branch passed with:

- `npm run format` reporting no changes and `npm run validate` passing.
- Frontend tests: 154 passing.
- Backend tests: 244 passing.
- Total tests: 398 passing.
- Shared contracts, frontend, and backend production builds passing.
- The known Vite/Recharts chunk-size warning remaining non-blocking.
- `git diff --check` passing.
- The five README screenshots resolving to tracked files under `docs/assets/`.
- Automated tests remaining offline and not contacting NBA.com.

## Immediate Next Action

Refresh the five portfolio screenshots under `docs/assets/` (landing desktop, player profile, career
trends, player comparison, landing mobile) to the completed dark UI using deterministic fixture data,
then update the README alt text if needed. This is the one remaining item before release: the dark
redesign and the audit-driven release polish are implemented, validated (166 frontend, 244 backend,
410 total; all builds passing; the known Recharts/Vite chunk-size warning is non-blocking), and
committed on `feature/visual-redesign-2-foundation`, but the branch is still local-only and the
tracked screenshots still show the previous light design. After the screenshots are refreshed, and
only when explicitly instructed, push the branch, open a pull request, verify CI, merge to `main`, and
verify the Render deployment (Stage D). Pushing, opening a pull request, merging, and deploying remain
deferred until explicitly requested.

## How To Update This File

After completing a task, update the fields above, including the milestone, task, status,
and branch. Refresh the summary so it describes only verified repository and deployment
state, and set the immediate next action to the next concrete step.

Keep this file truthful. Do not describe a feature, deployment, test result, provider
mode, or connectivity result as complete unless it has actually been verified.
