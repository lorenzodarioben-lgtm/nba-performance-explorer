# NBA Performance Explorer — Portfolio Summary

A concise, copy-ready overview of the project for portfolios, applications, and interviews.
Everything here reflects the actual repository and deployment; nothing is aspirational.

- **Live demo:** https://nba-performance-explorer.onrender.com
- **Source:** https://github.com/lorenzodarioben-lgtm/nba-performance-explorer
- **Status:** Deployed and live-backed by NBA.com Stats through the project's own backend.

> Unofficial portfolio project. Not affiliated with, endorsed by, or sponsored by the NBA.
> Statistics are sourced from NBA.com when the live provider is enabled.

---

## Project Summary

**NBA Performance Explorer** is a responsive full-stack web app for exploring NBA player
performance. A user can search for any player, open their profile, browse season-by-season
statistics, read an accessible career-trend chart backed by an equivalent data table, review
game-by-game logs, and compare two players side by side through a shareable URL.

- **Value proposition:** turn raw NBA season and game data into readable statistics, trends,
  and shareable two-player comparisons, served from a single, same-origin web service.
- **Primary user:** a basketball fan or analyst who wants to look up a player and quickly
  understand season performance, career trends, and head-to-head comparisons.
- **Secondary user:** reviewers (hiring managers, collaborators) evaluating engineering
  quality through the code, tests, and documentation.

## Architecture At A Glance

- **Frontend:** React 19 + TypeScript, built with Vite, styled with Tailwind CSS. TanStack
  Query owns server state; React Router owns routing and shareable URL state; Recharts renders
  the career-trend visualization.
- **Backend:** Node.js 22 + Express 5 in TypeScript. The Express app is separated from the
  local server entry point so it can be tested without opening a port.
- **Shared contracts:** Zod schemas and inferred TypeScript types live once in
  `packages/contracts` and are imported by both apps, so request/response validation and types
  cannot drift.
- **Data-provider boundary:** the backend depends on a `PlayerProvider` interface, not on any
  specific NBA source. A fixture provider is the deterministic default for local development,
  tests, and CI; a backend-private `NbaStatsPlayerProvider` serves live production data. Raw
  provider shapes never leak past the boundary — components consume internal domain models only.
- **Deployment:** a single Render web service runs the Express process, which serves both the
  built SPA (`frontend/dist`) and the `/api` routes from one origin (no CORS, no cross-service
  proxy). GitHub Actions runs `npm run validate` on every push and pull request.

```
Browser (React SPA) ──/api──▶ Express API ──▶ PlayerProvider ──▶ Fixture (tests/local)
                                                            └──▶ NBA.com Stats (production)
                              Express validates public responses with shared Zod contracts.
```

## Feature Overview

- Live player search through an accessible, debounced combobox.
- Player profile with bio and team details, tolerant of free agents, retired players, and
  multi-team aggregate seasons.
- Available-season list and selected-season statistics via native labeled controls.
- Career-trend line chart paired with an equivalent semantic data table.
- Selected-season game logs in a semantic, horizontally scrollable table.
- Two-player season comparison with shareable URLs (player and season state in the URL).
- Sanitized loading, empty, and error states throughout.

## Live NBA Provider

- Direct, backend-only access to NBA.com Stats endpoint families (`commonallplayers`,
  `commonplayerinfo`, `playercareerstats`, `playergamelog`).
- Strict Zod parsing of upstream responses, bounded process-local caching, a configurable
  10-second timeout, zero automatic retries, and stable, sanitized provider errors.
- No silent fixture fallback in production: a configured live provider that fails returns a
  sanitized error instead of quietly substituting fixture data.
- No proxying, IP rotation, cookie harvesting, CAPTCHA bypass, or other blocking-evasion
  behavior. NBA.com person IDs are preserved so player URLs stay stable.

## Quality, Testing, And Accessibility

- **Deterministic tests:** 404 automated tests (160 frontend, 244 backend) run entirely
  offline and never contact NBA.com. The frontend uses Vitest + Testing Library with Mock
  Service Worker; the backend uses Vitest + Supertest against the Express app.
- **Validation gate:** `npm run validate` runs Prettier format checking, ESLint, strict
  TypeScript (with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`), all tests,
  and production builds for the contracts, frontend, and backend workspaces.
- **Accessibility-focused UI** (specific techniques, not a certification claim):
  - A search combobox with `aria-expanded`/`aria-controls`/`aria-activedescendant`, listbox
    and option roles, and Arrow/Enter/Escape keyboard handling.
  - Programmatic heading focus on client-side route entry.
  - Polite live regions for loading states and sanitized alert text for errors.
  - Semantic tables with captions and scoped row/column headers; wide tables live inside
    keyboard-focusable, accessibly named horizontal scroll regions.
  - A career chart hidden from assistive technology that always ships an equivalent data
    table, with line series distinguished by dash pattern and legend shape rather than colour
    alone.
  - A dependency-free top-level error boundary that replaces a blank screen with a sanitized,
    keyboard-accessible recovery screen.

## Known Operational Limitation

NBA.com Stats is undocumented and unsupported as a public API. It can rate-limit, block
shared cloud-hosting IPs, change schemas, time out, or temporarily return a structurally valid
but **empty** result for an individual player. During a production smoke check, one player's
career response returned zero rows while another player returned complete season data through
the same client, parser, and mapper. This is handled as an upstream operational limitation:
the app renders sanitized empty/error states and never special-cases a player, adds fallback
statistics, or silently substitutes fixture data.

## Resume Bullets

- Built a full-stack NBA statistics explorer with a React 19, TypeScript, and Vite frontend and
  a Node.js 22 and Express 5 backend, a replaceable data-provider boundary, and shared Zod API
  contracts, deployed as a single same-origin service on Render with GitHub Actions CI.
- Integrated a live NBA.com Stats provider behind a backend-only boundary with strict runtime
  validation, sanitized error states, and no silent fixture fallback, while keeping fixtures as
  the deterministic default for 398 offline automated tests (154 frontend, 244 backend).
- Implemented accessibility-focused data interaction: a keyboard-navigable search combobox, a
  career chart paired with an equivalent semantic table (non-colour-only series), route-level
  focus management, and a top-level React error boundary with a sanitized recovery screen.

## Interview Talking Points

**Motivation and user problem.** I wanted a realistic full-stack project around a real, messy
external data source rather than a toy CRUD app. The user problem is concrete: look up a
player, understand a season, see career trends, and compare two players — all shareable by URL.

**Architecture and separation.** The frontend talks only to my own Express API and consumes
internal domain models; it never sees raw NBA.com responses or credentials. Shared Zod
contracts give one source of truth for request/response shapes across both apps.

**Provider abstraction (fixture vs. live).** The backend depends on a `PlayerProvider`
interface. Fixtures keep local development, tests, and CI deterministic and offline; a
backend-private live provider serves production. Swapping sources is configuration, not a
rewrite.

**Testing strategy.** 398 deterministic tests run offline — MSW mocks the network on the
frontend, Supertest exercises the Express app on the backend. Tests assert observable behavior
(roles, sanitized text, focus) rather than implementation details.

**Deployment.** One Render web service serves the SPA and the API from a single origin, which
removes CORS and cross-service proxying. A health check and a documented configuration rollback
keep operations simple.

**Accessible visualizations.** The career chart is hidden from assistive technology and always
ships an equivalent data table; series are distinguished by dash pattern and legend shape, not
colour alone. Route changes move focus to the page heading.

**Error-boundary design.** A dependency-free top-level boundary catches unexpected descendant
render errors and shows a sanitized recovery screen with a focused heading and a keyboard
reload action — it never renders the thrown error, a stack trace, or component names.

**Upstream reliability and the empty-data incident.** NBA.com is undocumented and can return a
valid-but-empty career for a specific player. I diagnosed it with a bounded, sanitized local
comparison and confirmed the mapper was not discarding rows — the upstream simply returned
none. I deliberately rejected silent fixture fallback, per-player special-casing, proxies, and
retry loops, because hiding a data-source limitation behind fake or substituted data would make
the app dishonest and harder to trust.

**Security and privacy.** All credentialed/external access is backend-only; no secrets reach
the bundle or the repo. Errors are sanitized so provider internals, headers, and tokens are
never exposed to the browser.

**Trade-offs and hardest problem.** The hardest work was making the live provider trustworthy:
strict validation, sanitized errors, no silent fallback, and bounded caching — versus the
temptation to "make it always work" by masking upstream gaps. The main accepted trade-off is
using an undocumented upstream (ADR-013): great data fit and stable IDs, at the cost of
guaranteed availability from cloud hosts.

**What I learned / would improve with more time.** Designing for an unreliable dependency
changes the whole UX (sanitized states, no silent fallback). With more time I would add bundle
splitting for the chart, broader observability, and end-to-end tests.

## Optional Future Enhancements

These are explicitly optional and **not** required for portfolio readiness:

- Code-split the Recharts-heavy chart bundle to clear the known Vite chunk-size warning.
- Move to a documented or licensed upstream data provider if guaranteed availability is needed.
- Add structured observability (request metrics, upstream health) behind the backend.
- Add team-level or multi-season analytical views.
- Add Playwright end-to-end and automated visual-regression coverage for the core journey.
