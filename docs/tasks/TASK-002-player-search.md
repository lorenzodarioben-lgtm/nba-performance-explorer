# TASK-002 - Player Search

- **Milestone:** Player Search Vertical Slice
- **Status:** Completed and merged (commit `0f60737`, merged into `main` via pull request #2 in merge commit `5c3fe2e`)
- **Branch:** `feature/player-search`

> Read `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`,
> `docs/PROJECT_STATE.md`, and `docs/DECISIONS.md` before starting. Stay strictly within
> this task.

## Goal

Allow users to search fixture-backed NBA players from the home page and navigate to a
bounded placeholder player route.

This task implements the first product vertical slice while preserving the existing
frontend-to-backend boundary, shared runtime contracts, and replaceable backend provider
architecture. It must not connect to a live NBA API or implement a full player profile.

## Required Behaviour

- Provide an accessible search input with a clear visible label.
- Trim surrounding whitespace before deciding whether to search and before sending the
  query to the backend.
- Do not send a search request until the trimmed query contains at least two characters.
- Debounce eligible searches by approximately 300 milliseconds.
- Display no more than eight results.
- Display each player's full name, team abbreviation, and position when available.
- Provide accessible loading, empty, and error states.
- Support selecting a result with a mouse.
- Support keyboard interaction:
  - `ArrowDown` moves the highlight to the next result.
  - `ArrowUp` moves the highlight to the previous result.
  - `Enter` selects the highlighted result.
  - `Escape` closes the results.
- Make the highlighted result visually and semantically identifiable.
- Navigate a selected result to `/players/:playerId`.
- Render a bounded placeholder at the player route stating that the full profile belongs
  to a later task.
- Use TanStack Query for server search state.
- Keep ephemeral combobox state in React state. Do not introduce Redux or Zustand.
- Use fixture data through the backend provider boundary.
- Do not connect to a live NBA API.

## Shared Contracts

Define Zod schemas and inferred TypeScript types in `packages/contracts` for:

- `TeamSummary`, containing the team abbreviation required by search results.
- `PlayerSummary`, containing a stable player ID, full name, `TeamSummary`, and an optional
  position.
- `PlayerSearchResponse`, containing an array of no more than eight `PlayerSummary`
  entries.

The frontend and backend must import these shared schemas and types rather than defining
independent copies.

Keep these models limited to player-search needs. Do not add complete game, season, game
log, comparison, or statistical models.

## Backend Work

- Add a player-provider interface for the search operation.
- Add a fixture-backed implementation behind that interface.
- Keep provider fixture shapes private to the provider layer.
- Map provider data into the shared internal player-summary models before returning it to
  routes or clients.
- Add `GET /api/players?search=<term>`.
- Validate that `search` exists, is a string, and contains at least two characters after
  trimming.
- Match the normalized query case-insensitively against player full names.
- Reject missing, blank, and one-character searches with an HTTP 400 response using the
  existing shared structured error contract.
- Return a `PlayerSearchResponse` validated by the shared schema.
- Sort matches by full name, then stable player ID as the tie-breaker, so the same fixture
  query always produces the same ordered response.
- Return no more than eight results.
- Keep route handling, provider access, and provider-to-domain mapping responsibilities
  separated.
- Preserve the existing application/server separation and generic error handling.

## Frontend Work

- Add a player-search API client that requests `/api/players` and validates successful
  responses with the shared `PlayerSearchResponse` schema.
- Use the existing relative API-base behaviour and Vite proxy.
- Add a TanStack Query search hook with a query key derived from the normalized search
  term.
- Debounce eligible input by approximately 300 milliseconds before enabling the request.
- Implement accessible combobox/listbox semantics, including the input/listbox
  relationship, expanded state, active option, and option selection state.
- Render the player results with name, team abbreviation, and optional position.
- Render accessible loading, empty, and error states without replacing the input.
- Support mouse and required keyboard selection.
- Ensure older responses cannot replace results for a newer normalized query.
- Navigate selected players to `/players/:playerId`.
- Add a bounded placeholder component for the player route.
- Keep the search experience usable at mobile widths without unrelated redesign work.

## Tests

### Backend

- Missing searches return a structured HTTP 400 error.
- Blank searches return a structured HTTP 400 error.
- One-character searches return a structured HTTP 400 error.
- Surrounding whitespace is trimmed.
- Matching fixture players are returned.
- Responses contain no more than eight players.
- Result ordering is deterministic.
- Successful responses pass `PlayerSearchResponseSchema`.
- Error responses pass the existing `ApiErrorResponseSchema`.
- Provider-specific raw data does not leak into API responses.

### Frontend

- No request occurs when the trimmed input contains fewer than two characters.
- Eligible requests are debounced by approximately 300 milliseconds.
- Successful results are displayed with name, team, and optional position.
- Accessible loading, empty, and error states are displayed.
- Mouse selection navigates to the selected player.
- `ArrowDown` and `ArrowUp` move the highlighted result.
- The highlighted result is exposed visually and semantically.
- `Escape` closes the results.
- `Enter` opens the highlighted player.
- Older responses do not replace results for a newer search.
- Selection navigates to the expected `/players/:playerId` URL.
- Successful API data is runtime-validated with the shared player-search contract.

Use the existing Vitest, React Testing Library, jest-dom, jsdom, MSW, and Supertest setup.
Do not add a new testing framework or dependency for this task.

## Acceptance Criteria

- [x] Fixture-backed player search works from the home page.
- [x] Search does not run below two non-whitespace characters.
- [x] Surrounding input whitespace is trimmed.
- [x] Eligible requests are debounced by approximately 300 milliseconds.
- [x] No more than eight results appear.
- [x] Results show player name, team abbreviation, and position when available.
- [x] Loading, empty, and error states are accessible.
- [x] Mouse selection works.
- [x] `ArrowDown`, `ArrowUp`, `Enter`, and `Escape` work as specified.
- [x] The highlighted result is visually and semantically identifiable.
- [x] Selection navigates to `/players/:playerId`.
- [x] The player route renders only the bounded placeholder described by this task.
- [x] Frontend and backend use the shared player-search schemas and inferred types.
- [x] Provider-specific raw responses do not enter React components.
- [x] No live NBA API is used.
- [x] Formatting passes.
- [x] Lint passes.
- [x] Strict type checking passes.
- [x] Tests pass.
- [x] The production build passes.
- [x] Full root validation passes.

## Explicitly Out of Scope

- Full player profile implementation.
- Season statistics.
- Game logs.
- Charts.
- Player comparison.
- Favourites.
- Recently viewed players.
- Authentication.
- Live NBA API access.
- Deployment changes.
- New state-management libraries.
- Unrelated redesign work.

## Definition of Done

- All acceptance criteria are implemented and verified.
- The complete git diff is reviewed.
- `docs/PROJECT_STATE.md` is updated with verified facts and the next action.
- Any new significant architecture decision is appended to `docs/DECISIONS.md`.
- No commit or push is made unless explicitly instructed.
