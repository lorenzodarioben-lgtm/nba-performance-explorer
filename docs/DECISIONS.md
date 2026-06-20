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
