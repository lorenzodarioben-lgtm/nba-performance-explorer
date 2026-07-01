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
