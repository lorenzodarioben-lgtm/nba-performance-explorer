# TASK-003 - Player Profile Overview

- **Milestone:** Player Profile Vertical Slice
- **Status:** Completed and merged (commit `c4c25c6`, merged into `main` via pull request #3 in merge commit `dc7af98`)
- **Branch:** `feature/player-profile`

> Read `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`,
> `docs/PROJECT_STATE.md`, and `docs/DECISIONS.md` before starting. Stay strictly within
> this task. TASK-002 (player search) is completed and merged; build on it without
> regressing it.

## Goal

Replace the bounded player placeholder at `/players/:playerId` with a real, fixture-backed
player profile overview page.

A user who selects a player from search, navigates directly to `/players/:playerId`, or
refreshes that route in development must see a responsive profile overview loaded from our
own backend. This is the second product vertical slice. It preserves the existing
frontend-to-backend boundary, the shared runtime contracts, and the replaceable backend
provider. It must not connect to a live NBA API, and it must not implement season
statistics, game logs, charts, or comparison.

## Required Behaviour

- Selecting a player search result continues to navigate to `/players/:playerId`.
- The profile route loads the selected player from the backend by ID.
- Direct navigation to `/players/:playerId` and a browser refresh on that route both work in
  development (the Vite dev server already serves the SPA fallback, verified in TASK-002).
- Display an accessible loading state while the profile is being fetched.
- Display a complete player profile when the request succeeds.
- Display a clear, accessible **not-found** state for a syntactically valid but unknown
  player ID (HTTP 404).
- Display an accessible **generic error** state for invalid-ID (HTTP 400), server (HTTP
  5xx), and contract-validation failures.
- Provide keyboard-accessible navigation back to the home/search page.
- The page must work at desktop and mobile widths without unrelated redesign.

## Player Profile Content

The profile displays the following. Optional values must be **omitted or clearly
represented** — never rendered as `undefined`, `null`, `NaN`, or dangling labels/punctuation
(for example, no empty "Position:" row and no stray separators).

| Field | Source | Required |
| --- | --- | --- |
| Full name | player | always |
| Team name | team | always |
| Team abbreviation | team | always |
| Team city | team | always |
| Position | player | when available |
| Jersey number | player | when available |
| Height | player | when available |
| Weight | player | when available |
| Country | player | when available |
| Draft information | player | when available |

The fixture data may be illustrative, but it must be internally consistent (height, weight,
team, draft, and country must read as a plausible single player) and must clearly remain
fixture-backed (no implication of a live data feed). At least one fixture player must omit
each optional field, and at least one fixture player must be undrafted, so the optional and
not-available paths are genuinely exercised by tests.

## Shared Contracts

Define strict shared Zod schemas and inferred TypeScript types in `packages/contracts`, and
import them from both the frontend and backend. Do not duplicate any schema in either
application.

Define:

- `PlayerProfile` — the player identity plus the profile fields above.
- `PlayerProfileResponse` — the single-player response envelope (for example
  `{ player: PlayerProfile }`), mirroring how `PlayerSearchResponse` wraps `players`.
- A nested team model rich enough for the profile (the existing `TeamSummary` only carries
  `abbreviation`). Prefer extending the existing contract, for example a `TeamProfile` that
  reuses `TeamSummary` and adds `name` and `city`, rather than redefining the abbreviation.
- A nested `DraftInfo` model only if draft data is modelled as a structured object.

Reuse the existing `PlayerSummary` and `TeamSummary` contracts where appropriate (for
example, compose `PlayerProfile` from the summary identity fields rather than restating
`id`/`fullName`/`position`).

A concrete proposed shape (open to refinement during planning, but this is the intended
direction):

- `TeamProfile`: `abbreviation` (reuse `TeamSummary`, `^[A-Z]{3}$`), `name` (non-empty),
  `city` (non-empty).
- `DraftInfo` (optional on the profile): `year` (int), `round` (int ≥ 1), `pick` (int ≥ 1,
  overall pick). Undrafted players omit `draft` entirely.
- `PlayerProfile`: `id` (public ID), `fullName`, `team: TeamProfile`, optional `position`,
  optional `jerseyNumber` (string, to allow values such as `00`), optional
  `heightCentimeters` (int), optional `weightKilograms` (int), optional `country` (string),
  optional `draft: DraftInfo`. Units must be explicit in both the field names and the UI.
- `PlayerProfileResponse`: `{ player: PlayerProfile }`, strict.

Keep these models limited to player-profile needs. Do **not** add season, game, game-log,
statistic, chart, comparison, or live-provider response models.

## Backend Work

- Extend the existing player-provider interface with a focused read operation, for example
  `getPlayerById(playerId: string): Promise<PlayerProfile | null>` (return `null`/absent for
  an unknown ID rather than throwing).
- Extend the fixture-backed provider to satisfy it, keeping the fixture record shape private
  to the provider layer and mapping it to the shared `PlayerProfile` domain model before
  returning. Reuse or extend the existing fixture-to-domain mapper; do not leak private
  fixture field names.
- Extend the existing fixture records with the additional private profile fields (team name,
  team city, jersey number, height, weight, country, draft), keeping them illustrative and
  internally consistent.
- Add `GET /api/players/:playerId`.
- Player IDs use the repository's established public ID format (the fixtures use numeric NBA
  -style IDs such as `2544` and `1641705`). Validate the `:playerId` parameter against that
  format.
  - Syntactically invalid IDs (for example non-numeric input) return a structured **HTTP
    400** using the shared error contract (suggested code `INVALID_PLAYER_ID`).
  - Syntactically valid but unknown IDs return a structured **HTTP 404** (suggested code
    `PLAYER_NOT_FOUND`).
  - Known IDs return a `PlayerProfileResponse` validated by the shared schema before it is
    sent.
- Keep route handling, parameter validation, provider access, and provider-to-domain
  mapping as separated responsibilities, consistent with the search endpoint.
- Place the new route so it does not shadow the existing search route (`GET /` with a
  `search` query) or its `405` handler; the search and profile handlers must coexist.
- The existing player-search (`GET /api/players?search=`) and health (`GET /api/health`)
  endpoints must continue to work unchanged.
- Do not return stack traces or internal/provider details in any error response.
- No live NBA API is introduced.

## Frontend Work

Replace the placeholder route with a real player-profile feature. Remove the bounded
placeholder component (or repurpose it) so the route renders the real profile.

- Add a profile API client that requests `GET /api/players/:playerId`, validates successful
  responses with the shared `PlayerProfileResponse` schema, and distinguishes a `404`
  not-found response from other failures (so the UI can show the not-found state versus the
  generic error state). Reuse the existing relative API-base helper and Vite proxy.
- Add a TanStack Query profile hook with a query key in the responsibility of
  `["players", "profile", playerId]`, enabled when a route player ID is present, with
  TanStack Query's `AbortSignal` passed to `fetch`.
- Read the `:playerId` route parameter and drive the query from it.
- Render accessible loading, success, not-found, and generic-error states. The error/not-
  found states must not strand the user — provide the back-to-search navigation in every
  state.
- Render the profile with semantic markup (see Accessibility). Render optional metadata only
  when present, with no `undefined`/`null`/empty output.
- Keep server state in TanStack Query and ephemeral UI state in React state only. Do not
  introduce Redux or Zustand, and do not add unrelated global state.
- Keep the profile usable at mobile and desktop widths without unrelated redesign work.

## Accessibility

- Use exactly one clear page-level heading for the profile (the player's name is a sensible
  choice).
- Loading feedback must be announced accessibly (for example a polite live region).
- Not-found and generic-error messages must be accessible (for example an alert/status role
  with clear text).
- Profile metadata must use semantic markup (for example a description list for label/value
  pairs) rather than visually-styled `div`s alone.
- Back navigation must be a real, keyboard-operable link/control.
- Missing optional fields must not produce confusing screen-reader output (no empty labels
  or values read aloud).
- Information must not rely on colour alone (states and labels must be conveyed by text and
  structure too).
- Focus behaviour after navigation to the profile must remain sensible (for example move or
  expose focus to the profile heading on load, rather than leaving focus stranded).

## Tests

Use the existing Vitest, React Testing Library, jest-dom, jsdom, MSW, and Supertest setup.
Do not add a new testing framework or dependency.

### Backend

- A known player ID returns HTTP 200.
- The successful response passes `PlayerProfileResponseSchema`.
- A syntactically invalid ID returns a structured HTTP 400 (`ApiErrorResponseSchema`).
- A syntactically valid but unknown ID returns a structured HTTP 404
  (`ApiErrorResponseSchema`).
- Optional fields are handled correctly (a player missing optional fields maps without those
  keys; an undrafted player has no `draft`).
- A complete fixture player maps every field correctly (identity, full team, and all
  optional fields present).
- Provider-private fixture fields do not appear in the response.
- The existing search endpoint still works.
- The existing health endpoint still works.
- Error responses do not expose stack traces or internal details.

### Frontend

- The route reads the expected player ID from `/players/:playerId`.
- The loading state is rendered and accessible.
- A successful profile renders identity and team information.
- Position and optional metadata render when present.
- Missing optional fields are omitted without `undefined`/`null`/empty output.
- The not-found state renders for a 404.
- The generic error state renders for a 500.
- An invalid-contract success response is treated as an error.
- Back navigation returns to the home/search page.
- Direct navigation to `/players/:playerId` renders the profile.
- Selecting a search result still opens the correct player profile.
- Existing player-search behaviour remains functional.
- Existing health behaviour remains functional.

## Acceptance Criteria

- [x] Known player profiles load from fixture-backed backend data.
- [x] Search selection opens the real player profile.
- [x] Direct `/players/:playerId` navigation works.
- [x] Browser refresh on the profile route works in development.
- [x] Shared profile contracts are used by frontend and backend.
- [x] Provider-private fields do not leak.
- [x] Invalid player IDs return structured 400 responses.
- [x] Unknown player IDs return structured 404 responses.
- [x] Loading state is accessible.
- [x] Not-found state is accessible.
- [x] Generic error state is accessible.
- [x] Player identity and team information render correctly.
- [x] Optional metadata renders safely.
- [x] Back navigation works.
- [x] Mobile and desktop layouts work.
- [x] Existing player search remains functional.
- [x] Existing health functionality remains functional.
- [x] Formatting passes.
- [x] Lint passes.
- [x] Strict type checking passes.
- [x] Tests pass.
- [x] Production build passes.
- [x] Full validation passes.

## Explicitly Out of Scope

- Season selection.
- Season averages.
- Game logs.
- Statistical cards.
- Performance insights.
- Charts.
- Player comparison.
- Favourites.
- Recently viewed players.
- Authentication.
- Live NBA API integration.
- Deployment changes.
- New state-management libraries.
- Unrelated redesign.

## Definition of Done

- All acceptance criteria are implemented and verified.
- The complete git diff is reviewed.
- `docs/PROJECT_STATE.md` is updated with verified facts and the next action.
- Any new significant architecture decision is appended to `docs/DECISIONS.md`.
- No commit or push is made unless explicitly instructed.
