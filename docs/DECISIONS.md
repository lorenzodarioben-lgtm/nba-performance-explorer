# Architecture Decision Records — NBA Performance Explorer

This file records significant decisions. Each entry has a stable ID, a status, the context
that prompted it, the decision itself, and its consequences. New significant decisions must
be appended here (do not rewrite history; supersede instead).

> Status legend: Accepted · Superseded · Proposed

---

## ADR-001 — Use TanStack Query for remote/server state

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** The application is read-heavy and built around fetching player, season, and
game data from our backend. We need consistent caching, loading/error handling, and
refetching without hand-rolling it per screen.

**Decision.** Use TanStack Query as the single owner of remote/server state. All data
fetched from our backend flows through it.

**Consequences.** Caching, request de-duplication, and loading/error states are handled in
one consistent place. Server state is kept out of any global client-state store. Local UI
state stays in React state and shareable filters stay in the URL (see ARCHITECTURE.md).

---

## ADR-002 — Use a backend data-provider abstraction

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** There are multiple possible NBA data sources, with different shapes, terms,
and reliability. Coupling the application to one source would make it brittle and hard to
change.

**Decision.** The backend depends on a data-provider interface, not on any specific NBA
data source. Concrete providers (fixtures now, a live source later) implement that
interface and map their raw responses into internal domain models.

**Consequences.** The frontend is not coupled to any single NBA data source. Swapping data
sources is a configuration and wiring change behind the backend, not a rewrite. Provider
response shapes never leak past the provider boundary.

---

## ADR-003 — Protect API credentials through the backend

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** Any live NBA data source will require credentials. Shipping those to the
browser would expose them publicly.

**Decision.** All credentialed access happens in the backend. API credentials are never
included in the frontend bundle and never committed. Secrets are provided via environment
variables; a committed `.env.example` documents variable names with no real values, and
real `.env` files are git-ignored.

**Consequences.** The frontend only ever talks to our own backend. Secrets stay server-side.
This is enforced as a security requirement and is part of the definition of done.

---

## ADR-004 — Use Recharts initially instead of D3

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** The product needs interactive performance charts. D3 is powerful but
lower-level and slower to build with; we want to reach a working, accessible chart quickly.

**Decision.** Use Recharts for visualisations initially.

**Consequences.** Faster delivery of standard charts with sensible defaults. If a future
visualisation genuinely exceeds what Recharts can do, that need will be recorded as a new
decision before adopting a lower-level library such as D3.

---

## ADR-005 — Develop against fixture data before connecting a live provider

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** A live NBA API adds credentials, rate limits, and instability that would slow
down building the core application and its tests.

**Decision.** Build against fixture / mock data first. A live provider is integrated only
after the application and its tests are working against fixtures. No live NBA API
integration happens during TASK-001.

**Consequences.** The team can build and test the full core journey deterministically and
offline. The data-provider abstraction (ADR-002) makes the later switch to a live source
low-risk.

---

## ADR-006 - Use npm workspaces

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** The frontend, backend, and shared API contracts need independent package
boundaries while remaining simple to install and validate as one repository.

**Decision.** Use npm workspaces with exactly `frontend`, `backend`, and
`packages/contracts`, managed by one root `package-lock.json`.

**Consequences.** A single `npm ci` installs the repository, root scripts coordinate all
workspaces, and no additional monorepo orchestrator is required.

---

## ADR-007 - Share API contracts through a workspace

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** Duplicating response schemas in the frontend and backend would allow their
runtime validation and TypeScript types to drift.

**Decision.** Define Zod schemas and inferred TypeScript API types once in
`packages/contracts`. Both applications import the same compiled package.

**Consequences.** API response changes have one source of truth. The contracts workspace
must build before commands that consume it.

---

## ADR-008 - Separate the Express application from the local server

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** Tests and future serverless adapters need the Express application without
opening a network port.

**Decision.** `backend/src/app.ts` creates and exports the Express application.
`backend/src/server.ts` is the local process entry point that calls `listen`.

**Consequences.** Supertest can exercise the application directly, local development
remains straightforward, and a future deployment adapter can reuse the app without
changing route setup.

---

## ADR-009 - Standardize the repository on Node.js 22

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** Development, CI, and package compatibility need a documented runtime target.

**Decision.** Target Node.js 22 with root engines `>=22.12.0 <23`, `.nvmrc` set to `22`,
and GitHub Actions configured for Node.js 22.

**Consequences.** Contributors and CI share one runtime major. Dependencies must remain
compatible with the supported Node.js 22 range.

---

## ADR-010 - Integrate Tailwind CSS through the Vite plugin

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** Tailwind CSS 4 provides a first-party Vite integration that avoids a separate
PostCSS configuration for this application.

**Decision.** Use `tailwindcss` with `@tailwindcss/vite` in the frontend Vite configuration
and import Tailwind from the application stylesheet.

**Consequences.** Styling participates directly in the Vite pipeline with minimal
configuration.

---

## ADR-011 - Use React Router Declarative Mode

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** The application needs client-side routing and shareable URLs, but TASK-001
does not need framework mode, route loaders, SSR, or data-router APIs.

**Decision.** Use the `react-router` package with `BrowserRouter`, `Routes`, and `Route`.
The installed stable release is React Router 7.18.0 because React Router 8.0.1 requires
Node.js 22.22.0 or newer, outside the TASK-001 verification environment.

**Consequences.** Routing stays component-based and compatible with Node.js 22.19.0. A
future upgrade must preserve Declarative Mode unless a separate decision changes the
routing architecture.

---

## ADR-012 - Use relative API requests with a Vite development proxy

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** Local frontend development should call the backend without browser CORS
configuration, while deployed environments may place the API on another non-secret
origin.

**Decision.** The frontend requests relative `/api` URLs by default. Vite proxies `/api` to
the local backend. `VITE_API_BASE_URL` may optionally provide a non-secret base URL.

**Consequences.** Local development remains same-origin and simple. Credentials must never
be placed in `VITE_` variables because those values are exposed to browser code.

---

## ADR-013 - Use direct NBA.com Stats access with accepted product risks

- **Status:** Accepted
- **Date:** 2026-06-21

**Context.** TASK-008 needs live player search, profiles, complete historical regular-season
statistics, career trends, game logs, and two-player comparison while preserving the NBA.com
person IDs already used by routes, fixtures, tests, and bookmarks. API-Sports was validated and
rejected because its proprietary IDs, incomplete search behavior, limited historical coverage,
multi-request career discovery, game-log joins, and 100-request daily free tier did not fit the
application. Direct NBA.com Stats access was validated locally from Node.js 22 against
`commonplayerinfo`, `playercareerstats`, and `playergamelog`. A Python `nba_api` sidecar would call
the same upstream endpoints and showed no reliability advantage.

NBA.com Stats is undocumented and unsupported as a public API. NBA.com terms may restrict a
public, comprehensive, regularly updated statistics application and may require written
permission. Shared cloud-hosting IP ranges may be blocked or time out, and endpoint availability
or schemas may change without notice. The project owner understands and accepts those product,
legal, and reliability risks for this low-traffic portfolio project.

**Decision.** Implement `NbaStatsPlayerProvider` as a direct Node.js 22 `fetch` implementation
behind the existing `PlayerProvider` interface. Use only `commonallplayers`,
`commonplayerinfo`, `playercareerstats`, and `playergamelog` for TASK-008. Search a cached live
`commonallplayers` directory locally. Select the provider explicitly with
`NBA_DATA_PROVIDER=fixture|nba-stats`; fixture mode remains the default for tests, CI, and offline
demonstrations. Live mode uses a configurable 10-second timeout, private Zod validation, bounded
process-local caching, stable provider errors, zero automatic retries, and no silent fixture
fallback.

Preserve NBA.com person IDs. Widen the public player/profile/season contracts so team fields may be
absent for free agents, inactive or retired players, and multi-team aggregate seasons. Never
represent NBA.com's `TOT` aggregate marker as a real team.

No proxy, WAF bypass, IP rotation, cookie harvesting, or other blocking-evasion technique is
authorized. Before live production mode is enabled, the intended deployment environment must pass
a bounded connectivity check against all four selected endpoints. A failed deployment check stops
production enablement.

**Consequences.** The provider matches the application's current domain closely, keeps existing
player URLs stable, obtains complete career statistics efficiently, and requires no Python
runtime. The backend must add a direct `zod` dependency for private upstream schemas, implement
browser-compatible request headers, and maintain a bounded in-memory cache. The frontend must
render explicit `No current team` and `Multiple teams` states after the optional-team contract
widening. Automated tests remain completely offline.

The application and README must state prominently that the project is unofficial and unaffiliated
with the NBA, attribute NBA statistics and data to NBA.com, and disclose that endpoint stability,
availability, and deployment reachability are not guaranteed. Local success does not imply that a
cloud deployment will work.

---

## ADR-014 - Deploy on Render as a single same-origin web service with a fixture fallback

- **Status:** Accepted
- **Date:** 2026-06-22

**Context.** TASK-009 needs a publicly accessible, low-cost production deployment of the React/Vite
frontend and the Node.js 22 / Express backend. Current (2026) research found that Railway and
Fly.io no longer offer a genuine free tier, while Render and Koyeb do, and Vercel/Netlify are free
for static frontends. `stats.nba.com` is widely reported to block cloud datacenter IP ranges, so
live mode from any cloud host is uncertain and is gated by ADR-013. The project prioritizes
minimal cost, Node 22 support, GitHub deployment, HTTPS, secure environment variables, health
checks, rollback, and the simplest possible maintenance.

**Decision.** Deploy a single Render free Web Service that serves both the built frontend
(`frontend/dist`, with an SPA fallback) and the existing `/api` routes from the one Express
process, keeping the browser same-origin (relative `/api`, `VITE_API_BASE_URL` empty) with no
CORS and no cross-service proxy. Build with `npm ci && npm run build`; start with
`node backend/dist/server.js`; select Node 22 via root `engines`. Configure the health check at
`/api/health`. Static serving is gated by a `FRONTEND_DIST` environment variable so tests and the
existing `/api` 404 behavior are unchanged. Run the ADR-013 connectivity gate from the deployed
host before enabling live mode. Render runs the service with `NODE_ENV=production`, so the initial
fixture deployment explicitly sets `NBA_DATA_PROVIDER=fixture` and
`NBA_ALLOW_FIXTURE_IN_PRODUCTION=true`. If all four endpoints pass, set
`NBA_DATA_PROVIDER=nba-stats`, remove the fixture allowance or set it to `false`, and redeploy. If
any endpoint fails, retain the explicitly approved fixture demonstration. Production still
requires an explicit provider selection, and live-provider failures never silently fall back to
fixtures. CI stays offline and fixture-backed and does not deploy.

**Consequences.** One service, one HTTPS URL, one deploy, and one rollback give the simplest
maintenance, at the cost of a whole-app cold start on the free tier (~1 minute after 15 minutes
idle), optionally mitigated by a free uptime ping within the 750 free instance-hours/month. The
backend gains a small env-gated static-serving block and a connectivity-gate script. Because the
host's cloud IP is likely blocked by NBA.com, the public deployment will probably run in fixture
mode; the documentation must state that live data is disabled in that case, that this is the
accepted ADR-013 outcome, and that no blocking-evasion is used. Alternatives (Render static plus
web service, Vercel plus Render, Koyeb) were considered and recorded in the TASK-009 plan; they
add a second service or platform and cross-origin routing without improving NBA.com reachability.

### Verified Render outcome — 2026-06-22

The public Render deployment succeeded in fixture mode. The deployment-host connectivity gate
returned `PASS` for all four approved NBA.com endpoint families at the HTTP/JSON level. A live
`nba-stats` deployment then started successfully, but player search failed strict response
validation with `PROVIDER_INVALID_RESPONSE` and HTTP 502.

The ADR-013 fallback was therefore applied: production was restored to the explicitly approved
fixture demonstration. The public application remains healthy, no silent runtime fallback occurs,
and no blocking-evasion technique was introduced. Live provider schema investigation is deferred
to a separately scoped task.

### Verified live outcome — 2026-06-24 (TASK-010)

The `PROVIDER_INVALID_RESPONSE` was diagnosed and fixed in TASK-010. Sanitized Render diagnostics
(Stage B) proved the cause: one live `commonallplayers` directory row had a `DISPLAY_LAST_COMMA_FIRST`
value without a usable comma (stage `value-format`, category `invalid-last-comma-first-name`). The
strengthened connectivity gate (Stage D) now runs the real application parsers/mappers per endpoint,
and a narrow directory-name compatibility fix (Stage C) falls back to the full `DISPLAY_FIRST_LAST`
display name for such rows.

Stage E re-ran the strengthened gate from the Render host on `main` build `5518234`: all four
endpoints PASSED, including `commonallplayers` parsed end-to-end. Production was then switched to the
live provider and all eight public flows were verified over live NBA.com data. The project owner
elected to keep production live-backed; `render.yaml` is updated to `NBA_DATA_PROVIDER=nba-stats` and
`NBA_ALLOW_FIXTURE_IN_PRODUCTION=false` so the Blueprint source of truth matches the verified state.
The ADR-013 accepted risks remain; the documented rollback is `NBA_DATA_PROVIDER=fixture` with
`NBA_ALLOW_FIXTURE_IN_PRODUCTION=true`. No silent runtime fallback and no blocking-evasion technique
were introduced.

---

## ADR-015 - Adopt a dark broadcast-editorial direction for identity surfaces

- **Status:** Accepted
- **Date:** 2026-07-01

**Context.** The first visual redesign (Stages 1-3, recorded in `PROJECT_STATE.md`) established a
restrained light "sports-reference / data-terminal" system. The project owner asked for a
dramatically more expressive, premium basketball **editorial and sports-broadcast** experience for
the public-facing surfaces, closer in ambition to supplied design references, while keeping the
data-heavy views highly legible.

**Decision.** Adopt a dark, broadcast-editorial visual direction for the landing page and the shared
application shell: near-black `night`/`coal` backgrounds, a near-white `chalk` for large type, red
`#b91c1c` retained as the single interface accent, full-colour basketball photography, oversized
condensed display type, and a purposeful motion system. The light data-terminal system is retained
for the data views (player profile, selected-season statistics, career chart, game log, and
comparison) until each is redesigned in its own later stage. Routes, shared contracts, backend
behaviour, and all data/query/season/comparison/chart logic are unchanged.

**Consequences.** During the multi-stage rollout the application presents two coherent modes: an
expressive dark landing and shell that frame the calm, light data views. One accent (red) and the
sharp corner treatment are preserved; the blue keyboard focus ring and the green live-status
semantics are unchanged. Motion is implemented with CSS and IntersectionObserver only, gated on
`prefers-reduced-motion`; no animation dependency is added.

---

## ADR-016 - Self-host the condensed display and mono fonts (SIL Open Font License 1.1)

- **Status:** Accepted
- **Date:** 2026-07-01

**Context.** The broadcast-editorial direction (ADR-015) needs oversized condensed sports typography
and small technical mono labels; the system font stack cannot express that voice. Loading fonts from
a third-party CDN at runtime would add an external dependency and a privacy and performance cost.

**Decision.** Self-host two families as latin-subset `woff2` files under `frontend/public/fonts/`,
declared with `@font-face` and `font-display: swap`, preloading only the two above-the-fold hero
display weights:

- **Saira Condensed** (display; weights 600/700/800) - by Omnibus-Type.
- **JetBrains Mono** (technical labels; weights 500/700) - by JetBrains.

Both families are licensed under the **SIL Open Font License 1.1**, which permits self-hosting,
bundling, and redistribution of the font files. The `woff2` files were obtained from Google Fonts
(which distributes them under the OFL). No npm font dependency and no runtime CDN request are
introduced. Body copy stays on the fast system sans; the display face is reserved for identity and
structure and is never used for body text or data.

**Consequences.** About 100 KB of self-hosted font assets ship with the application, with no external
font request at runtime. The OFL applies to the shipped files; a font provenance and licence note
accompanies them at `frontend/public/fonts/README.md`.

---

## ADR-017 - Use supplied editorial photography as isolated, replaceable project imagery

- **Status:** Accepted
- **Date:** 2026-07-01

**Context.** The redesigned landing, and the forthcoming player-profile pages, use supplied editorial
basketball photography (Victor Wembanyama, Stephen Curry, and LeBron James) for the hero and
editorial compositions. The project needs a clear, neutral record of how this imagery is handled.

**Decision.** The supplied editorial photographs are used as project imagery for this portfolio
application. Image provenance and any production licensing remain the project owner's responsibility.
Only the images actually used are committed, under `frontend/public/images/`, with descriptive
filenames and accurate alternative text; the supplied sports-centre reference screenshot (private
design inspiration only) and the low-resolution stray image are not shipped and are kept out of the
repository via a git-ignored local `Images/` inbox. The imagery is isolated behind stable asset paths
and dark scrims so it can be replaced later with licensed, owned, or generated images without
touching layout or logic. The unofficial, non-affiliation disclaimer and the NBA.com data
attribution remain present and readable.

**Consequences.** Imagery is centralized and replaceable: swapping in different photographs, or a
photo-free editorial treatment, is a drop-in change under `frontend/public/images/`. This decision
covers imagery only and does not change the ADR-013 data-source posture, the non-affiliation notice,
or the data attribution.

---

## ADR-018 - Dark player-profile identity and scoreboard statistics with strict id-keyed imagery

- **Status:** Accepted
- **Date:** 2026-07-02

**Context.** The second stage of the dark redesign (ADR-015) covers the player profile, a data-heavy
identity surface. It must continue the dark, broadcast-editorial direction and keep the statistics
highly legible, and it must never show the wrong player's photograph.

**Decision.** Redesign the profile identity hero, biography, season selector, headline statistics, and
supporting statistics as fully dark surfaces (night / coal / chalk backgrounds, red accent, condensed
display type, scoreboard numerals, thin rules, and restrained court-line detail). Points, rebounds,
and assists render as oversized scoreboard figures; the remaining statistics form a calm dark stat
sheet with hairline separators rather than white cards. The non-success states (loading, invalid link,
not found, error) are rebuilt dark.

Map editorial player photography strictly by NBA person id
(`frontend/src/features/players/playerImages.ts`). A mapped player gets a full-bleed, masked hero
composition; a player without a mapping gets an intentional photo-free dark composition (condensed
typography, the jersey-number scoreboard graphic, a red broadcast glow, a team-neutral court-line
motif, and the real returned data). The wrong player's photograph is never shown.

The career trend chart, its accessible equivalent table, and the game log are **not** redesigned in
this stage. They remain in their existing light styling inside a temporary, deliberate light contrast
band, and are scheduled for a combined dark stage next. All statistic values, numeric formatting,
season-selection ownership, query keys, description-list semantics, the accessible "Season" select,
the section region and its states, heading focus, the semantic chart-equivalent table, and the
non-colour-only chart encoding are preserved unchanged.

**Consequences.** The profile continues the dark experience for identity and primary statistics while
the light chart / game-log band is explicitly temporary. Adding or replacing imagery is a drop-in
change to the id-keyed map, consistent with ADR-017. No routes, shared contracts, backend behaviour,
data logic, or Render configuration changed.

---

## ADR-019 - Dark career trends and game log; data-visualisation chart palette

- **Status:** Accepted
- **Date:** 2026-07-02

**Context.** The final data surfaces of the dark player profile (ADR-018) - the career trend chart
and its surrounding section, the accessible chart-equivalent table, and the game log and its
scrollable table - were left in a temporary light contrast band. They must be integrated into the
predominantly dark profile without losing legibility, the non-colour-only chart encoding, or the
scroll-region accessibility. The chart-series colours were originally the interface tokens (brand
red, focus blue, status green), which are too dark on a near-black panel and overload the UI accents.

**Decision.** Redesign the career-trends section, the Recharts chart, the equivalent table, and the
game log and its scrollable table as dark surfaces, and remove the temporary light band so the
profile is dark end to end. Treat the three chart-series colours as **data-visualisation colours**,
separate from the single red UI accent: lighten them for legibility on the near-black chart panel and
keep them distinct from the grid, the blue focus ring, and the green live-status - points bright red
`#f87171`, rebounds light blue `#60a5fa`, assists warm amber `#fbbf24`. (Recharts SVG cannot resolve
CSS custom properties, so these are literal hex values.) The grid, axes, tooltip, and legend are
restyled for dark. Red remains the single UI accent everywhere outside the chart.

Preserve, unchanged, the three-way series encoding (line dash patterns `solid` / `6 3` / `2 4`, the
legend marker shapes circle / square / triangle, and the equivalent table), the W/L fill-versus-
outline badge, tabular numerals, the table captions / scoped headers / semantic structure, the chart
`aria-hidden` plus equivalent-table accessibility pattern, the named keyboard-focusable horizontal
scroll region, the loading / empty / error / unavailable messages and roles, and reduced-motion
behaviour. Chart data and transforms, metric definitions, game-log data and formatting, the numeric
formatters, query ownership and keys, and season selection are not touched.

**Consequences.** The player profile is now a single continuous dark experience. Chart colours are
documented data-visualisation tokens verified for contrast on the coal panel (roughly 6.5-11:1) and
for distinctness from the interface accent, focus, status, and grid colours; the chart still
communicates without colour through dash patterns and marker shapes. No backend, contracts, routes,
data logic, or Render configuration changed.

---

## ADR-020 - Dark cinematic player comparison with a neutral accessible table

- **Status:** Accepted
- **Date:** 2026-07-02

**Context.** The two-player comparison route (`/compare`) was the last surface still using the light
Stage 1-3 "data-terminal" system, after the dark landing (ADR-015), the dark player profile
(ADR-018), and the dark career-trends and game-log stage (ADR-019). It must join the dark
broadcast-editorial direction while keeping the head-to-head unmistakably neutral: a comparison must
never imply a "winner", and every piece of comparison logic, URL state, and accessibility must be
preserved exactly.

**Decision.** Redesign `/compare` as a fully dark broadcast head-to-head. Every route now renders on
the dark `night` canvas - the previous per-route light exception for `/compare` is removed - and the
comparison page bleeds under the fixed masthead and owns its top spacing.

The composition is a player-versus-player hero: two equally prominent identity panels flanking an
oversized red "VS". The panels share identical dimensions, structure, and treatment (a shared minimum
height and `items-stretch`); neither is visually favoured. A confirmed panel is a masked, scrimmed
player photograph with a red jersey-number scoreboard figure, the player name as a condensed link to
the profile, and team / position / season technical labels, alongside the existing Replace and Clear
actions. Player photography is mapped strictly by NBA person id
(`frontend/src/features/players/playerImages.ts`, ADR-017); a player without a mapping gets an
intentional photo-free dark composition (a red broadcast glow and a court-line motif over the real
data), so the wrong player's photograph is never shown. Panel photography is decorative
(`aria-hidden`, empty `alt`) and the name link conveys identity. The player-search comboboxes use the
existing dark tone and the season selector uses the dark field styling.

The comparison table remains the authoritative, neutral representation. Both player columns receive
identical typography, colour, weight, and spacing; the only structural aid is a single thin neutral
divider between the two player columns. There is no winner colouring, arrow, badge, bolding, or
better/worse implication - the columns are read by numeric alignment alone. The selected season is
added to each column header beside the season team and remains in the caption.

Preserve, unchanged: the duplicate-player handling, the common-season intersection logic, and the
shareable comparison URL state (all owned by `comparison-state.ts`); query ownership and keys; the
player-search combobox keyboard and ARIA model (only its `tone` is set); season reconciliation;
comparison metrics and number formatting; route definitions and behaviour; and the table's caption,
scope, semantic structure, and the named keyboard-focusable horizontal scroll region (`role="group"`,
`aria-label`, `tabindex=0`, `max-w-full`, `overflow-x-auto`). Route heading focus, the accessible
combobox names (`Search for Player A` / `Search for Player B`), the single blue `:focus-visible`
ring, and all duplicate / loading / unavailable / no-common-season / invalid-season / empty / error
messages and their `status` / `alert` roles are preserved. Motion - the VS pop, the staggered panel
rise, and the image settle - is CSS-only and gated behind `prefers-reduced-motion` with the global
guard and the `.js` flag; controls and data are never gated behind motion.

**Consequences.** The application is now dark across all three routes - landing, player profile, and
comparison - with one red interface accent throughout. The comparison stays a serious, neutral
analytics surface: the cinematic framing is purely presentational, and the accessible semantic table
carries the actual comparison without implying a verdict. Adding or replacing panel imagery is a
drop-in change to the id-keyed map (ADR-017). No backend, shared contracts, routes, `render.yaml`,
comparison / URL / duplicate / common-season logic, query keys, statistical calculations, number
formatting, or the profile / chart / game-log implementations changed.

---

## ADR-021 - Final release polish: dark landing end to end, a display-red token, and accessibility parity

- **Status:** Accepted
- **Date:** 2026-07-02

**Context.** A whole-application adversarial audit after the dark redesign (ADR-015 through ADR-020)
confirmed the product was functionally sound but surfaced finishing items: the landing's Career Trends
section was still a light band (the last light surface in an otherwise fully dark application); the
landing heading did not take focus on navigation as the profile and comparison routes do; the mobile
navigation dialog did not trap keyboard focus; the large red display figures (jersey numbers and the
"VS") fell below the 3:1 large-text contrast floor on the dark surfaces; and several smaller items
(comparison action touch targets, the player-name link affordance, the career-trends table
scroll-region parity, visible em-dashes, and eyebrow over-use on the landing).

**Decision.** Complete the dark direction and close the audit's approved accessibility and polish
findings, without changing any data, logic, contracts, or routes:

- Convert the landing Career Trends section to the dark system (a charcoal surface, warm-white type,
  the red accent, the dark court-line motif, and a restrained red glow for cinematic depth). No light
  band remains anywhere; the application is dark from beginning to end. This completes the intent of
  ADR-015, retiring the earlier "one deliberate light band" now that every data surface is dark.
- Introduce a display-only red token, `--color-accent-bright` (#ef4444), used ONLY for large
  decorative scoreboard figures (jersey numbers and the "VS") on dark surfaces, where it reaches about
  5:1. The deeper `--color-accent` (#b91c1c) remains the single UI accent for links, controls, and
  interface emphasis. This is the same brand hue brightened for legibility, not a second accent.
- Make route-heading focus consistent across all routes: the landing `<h1>` receives focus on entry
  (matching the profile, comparison, and error boundary), remaining a `tabIndex={-1}` non-tab-stop
  with no permanent outline.
- Contain the mobile navigation dialog (`aria-modal`): Tab and Shift+Tab now cycle within the open
  panel, and focus is still restored to the toggle on close.
- Give the comparison Replace/Clear/Cancel actions real touch-target padding; give the comparison
  player-name link a persistent resting underline; and make the career-trends equivalent table a
  named, keyboard-focusable scroll region (`role="group"`, `aria-label`, `tabindex=0`) consistent with
  the game-log and comparison tables.
- Remove visible em-dashes from the page title and landing copy, reduce the landing section eyebrows
  to two, remove the redundant rotated hero label, and remove the dead `hero-title` class.

Focused tests cover the landing heading focus, the mobile-menu Tab containment and focus restoration,
and the named career-trends scroll region.

**Consequences.** The application presents one continuous dark broadcast-editorial experience across
every route, with consistent route-heading focus and a contained modal menu. Large red display figures
clear the 3:1 large-text contrast floor while the single UI accent is unchanged. No backend, shared
contracts, routes, Render configuration, query ownership, statistics, number formatting, chart or
game-log data, or comparison logic changed. The Recharts/Vite chunk-size warning remains a known,
non-blocking build note, and the portfolio screenshots under `docs/assets/` are still to be refreshed
to the dark UI before release.

---

## ADR-022 - NBA logo, expanded player-image registry, and a neutral comparison graph

- **Status:** Accepted
- **Date:** 2026-07-03

**Context.** A separately scoped visual enhancement follows the completed dark redesign: integrate the
supplied NBA logo, broaden the player photography (the landing over-used two players), and add a
visually impressive but honest statistical graphic to the comparison page. It must extend the approved
dark broadcast-editorial system without becoming an official-NBA claim, showing a wrong player's photo,
or implying a comparison winner.

**Decision.**

- **NBA logo.** The supplied NBA mark ships as `frontend/public/images/nba-logo.png` (cropped to the
  glyph, transparent) and appears once, in the masthead, replacing the text "NBA" chip beside the
  "Performance Explorer" wordmark. It is decorative (empty `alt`; the identity link keeps the
  accessible name "NBA Performance Explorer"), sized for the dark header, and is not a giant
  background, a repeated motif, or the favicon. A small "Unofficial player analytics" label sits with
  the wordmark, and the footer non-affiliation notice and NBA.com attribution are unchanged, so the
  project stays clearly unaffiliated. The logo is supplied editorial imagery; provenance and any
  production licensing remain the project owner's responsibility (consistent with ADR-017); this
  records no legal conclusion.
- **Expanded strict image registry.** `playerImages.ts` grows from three to fourteen players. Every id
  is a real NBA person id verified against the application's own data (the fixtures and the live search
  directory), never inferred from a face; ambiguous or unlabelled source files are left unmapped.
  Mapping stays strictly id-keyed and presentational, no two players share a photo file, and a player
  without a mapping still gets the intentional photo-free composition (never a stand-in or the wrong
  player). Alt text and per-image focal positions are recorded; no image-processing dependency was
  added.
- **Landing image diversity.** The landing shows a different player in each editorial slot (Wembanyama
  hero, then Luka Doncic, Giannis Antetokounmpo, and a Shai Gilgeous-Alexander versus James Harden
  teaser); no photo repeats on the page, and the previously over-used Curry and LeBron images no longer
  appear on the landing.
- **Comparison stat graph.** A supplementary "statistical matchup" graphic sits above the neutral
  comparison table when a valid common-season comparison is available. It is a mirrored, per-metric
  dual-bar "tale of the tape": each of the same eleven metrics is one row with both raw values always
  printed, scaled independently within its own row (never on a shared cross-metric scale), with a
  visible note that says so and safe handling of equal, zero, and unavailable values. The two series
  use the data-visualisation blue and amber (never the red UI accent or team colours), distinguished by
  colour, side, a hatch pattern, and persistent labels, with no winner colouring, arrows, ranking, or
  aggregate score. The graphic is `aria-hidden` and the comparison table remains the authoritative,
  screen-reader-accessible representation; the graph's heading and scale note stay outside the
  aria-hidden graphic, and the reveal motion is CSS-only, gated on `prefers-reduced-motion`, leaving
  every bar at its final width otherwise. The logo uses a decorative empty `alt` rather than an
  `aria-hidden` attribute so the career-trends test's "first aria-hidden element is the chart"
  assumption stays intact.

**Consequences.** The interface carries basketball brand context and a broader, correctly-mapped player
roster, and the comparison page gains an impressive yet neutral and accessible visual, without changing
any data, logic, contracts, routes, or the authoritative table. No backend, shared contracts,
`render.yaml`, query ownership, statistics, number formatting, chart or game-log data, comparison URL /
duplicate / common-season logic, or the existing profile fallback changed. Provenance and any
production licensing of the supplied NBA logo and player photography remain the project owner's
responsibility; the non-affiliation notice and NBA.com attribution remain present. The known
Recharts/Vite chunk-size warning remains non-blocking.

---

## ADR-023 - Comparison-page polish: detailed-table disclosure and a career-arc trend chart

- **Status:** Accepted
- **Date:** 2026-07-04

**Context.** After the neutral statistical-matchup graph shipped (ADR-022), the comparison page repeated
itself for sighted users: the detailed statistics table restated the same selected-season numbers the
graph already showed, and there was no way to compare the two players over time. This is a final,
separately scoped polish of the comparison page only; it does not redesign the page or add a second
matchup summary.

**Decision.**

- **Detailed table moved into a disclosure.** The authoritative, exact-value comparison table is kept
  unchanged (caption, row and column headers, scope attributes, selected-season context, and its named
  keyboard-focusable horizontal scroll region) but is collapsed by default behind a button-controlled
  disclosure (`aria-expanded` plus `aria-controls`, a `hidden`-toggled region) rendered below the graph
  and the new chart. The statistical-matchup graph stays visible by default, so the page leads with the
  visual and offers the exact numbers on demand. A button disclosure was chosen over native
  `<details>/<summary>` because it exposes state cleanly and behaves deterministically in tests.
- **Statistical-matchup graph refined.** The eleven metrics are unchanged in value, label, and formatter
  but are organised into four labelled groups (Availability, Scoring, Playmaking, Defense) with more row
  spacing, and a faint half-court motif sits behind the central axis. The independent per-row scaling, the
  blue and amber data-visualisation series distinguished by side and hatch, the always-printed raw values,
  the visible independent-scale note, the aria-hidden graphic, and the absence of any winner, ranking, or
  aggregate are all preserved. The motif is decorative and static (so it needs no reduced-motion handling)
  and never reduces bar or value legibility.
- **Career-arc trend chart added.** A supplementary "Career arc" section plots one selected metric
  season-by-season for both players as two equal-weight data-visualisation lines (blue and amber, never a
  team colour and never the red UI accent), distinguished beyond colour by dash pattern and legend marker.
  It reuses the existing player career-trends query (`usePlayerSeasonTrendsQuery`) for both players with no
  new endpoint, contract, or dependency; merges the union of their seasons chronologically; omits seasons a
  player has no data for and never bridges a gap; and offers a compact keyboard-accessible metric selector
  (defaulting to points per game) held in local UI state so the shareable comparison URL is untouched. It
  answers a different question from the selected-season matchup (trend over time, not a single season side
  by side), renders only in the valid comparison success state with enough loaded career data, shows a
  polished loading state, and otherwise shows a restrained unavailable message. The chart is decorative
  (aria-hidden) with a concise accessible textual summary as its equivalent, and carries no winner,
  ranking, or composite score.

**Consequences.** The comparison page is less visually repetitive, leads with two complementary neutral
visuals, and still exposes the exact authoritative table on demand with its semantics intact. No backend,
shared contracts, `render.yaml`, environment behaviour, routes, search or combobox behaviour, season
selection or reconciliation, comparison URL / duplicate / common-season logic, statistics, number
formatters, game-log data, existing career-chart logic, or the player-image registry changed; the career
data is read through the existing frontend query only, and no dependency was added. Validation covers the
work with 190 frontend and 244 backend tests (434 total). The known Recharts/Vite chunk-size warning
remains non-blocking. This branch is local only; pushing, a pull request, merging, and deployment are
deferred until explicitly requested.
