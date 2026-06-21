# TASK-007 — Two-Player Comparison

- **Milestone:** Two-Player Comparison Slice
- **Status:** Not started
- **Branch:** `feature/player-comparison`

> Read `AGENTS.md`, `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`,
> `docs/PROJECT_STATE.md`, and `docs/DECISIONS.md` before starting. TASK-001 through
> TASK-006 are completed and merged. Stay strictly within this task and preserve search,
> profile, season-statistics, career-trends, game-log, and health behaviour.

## Status

TASK-007 is documentation-defined. No implementation, dependency, shared-contract, backend,
frontend, or fixture change has started.

## Objective

Add a portfolio-grade, fixture-backed flow that lets a user choose exactly two distinct NBA
players and compare relevant regular-season performance through a responsive, accessible,
directly loadable URL.

The comparison must extend the existing architecture: the frontend calls only this
repository's backend, server state belongs to TanStack Query, public data crosses the
frontend/backend boundary through shared strict Zod contracts, and fixture-provider details
remain private.

## User Value

A user can move from player discovery to a clear side-by-side performance comparison, send
the comparison URL to another person, and restore the same valid comparison after direct
navigation or refresh. The comparison presents source values without declaring an automated
winner or fabricating conclusions.

## Verified Starting State

- TASK-001 through TASK-006 are merged into `main`.
- TASK-006 documentation commit: `1329ed4`.
- TASK-006 implementation commit: `507be68`.
- TASK-006 pull request: #6.
- TASK-006 merge commit: `1704dac`.
- The clean baseline passes 83 frontend tests and 75 backend tests (158 total).
- The frontend production bundle is 700.51 KB JavaScript (209.35 KB gzip) and 12.42 KB CSS
  (3.30 KB gzip).
- The existing Vite chunk-size warning is known and non-blocking.
- Existing public contracts include player summaries, player profiles, season summaries,
  and selected-season statistics.
- Existing APIs support player search, player profiles, available seasons, and
  selected-season statistics.
- Runtime data is fixture-backed. Live-provider integration and deployment are future work.

## In Scope

- A dedicated two-player comparison route and page.
- Selection of exactly two distinct players.
- Reuse of the existing accessible player-search behaviour or a deliberately extracted,
  equivalent selection primitive.
- Directly loadable and shareable URL state for both player IDs and the effective comparison
  season state decided during planning.
- Clear identity for both selected players.
- Comparison of existing regular-season statistics only.
- Deterministic handling of differing season availability.
- Accessible loading, incomplete, empty, invalid, unavailable, and generic-error states.
- Keyboard and pointer operation.
- Responsive presentation around a 375 px viewport with no page-level horizontal overflow.
- Focused shared contracts only if the implementation plan proves existing contracts cannot
  express the required public response.
- Focused backend/provider work only if the implementation plan proves composing existing
  endpoints is insufficient.
- Automated and manual regression verification for all completed features.

## Out of Scope

- Live NBA API integration.
- Deployment.
- Authentication or accounts.
- Favourites or recently viewed players.
- A calculated winner, automated verdict, or player ranking.
- Predictions, league averages, or advanced metrics not already represented by existing
  contracts.
- Playoff comparison.
- Game-by-game comparison, game-detail pages, play-by-play, or shot charts.
- Charts in the comparison view; existing career-trends charts remain unchanged.
- Exports or social-sharing services.
- Persistence outside URL state.
- Redux or Zustand.
- A second chart library.
- Unrelated visual redesign.
- Bundle optimization or code splitting.
- Dependency upgrades unrelated to TASK-007.

## User Journey

1. The user enters comparison from an existing product surface or directly through its URL.
2. The user selects Player A using familiar player-search interaction.
3. The user selects a distinct Player B.
4. The application resolves the valid comparison-season state.
5. The user reviews both identities and aligned regular-season statistics.
6. The user may replace either player or change the comparison season where allowed.
7. The URL updates to represent the current valid state.
8. Refreshing or opening that URL restores the same comparison.
9. The user can return to search or open either player's profile.

## Functional Requirements

- Exactly two distinct known players are required for a complete comparison.
- Selecting the same player twice is prevented during interaction and rejected when encoded
  in a direct URL.
- Both player identities remain visibly and semantically associated with their values.
- Values come from validated fixture-backed domain models, never provider-private records.
- The comparison includes, at minimum, the existing regular-season fields needed for a
  useful side-by-side view. The planning turn must choose a bounded subset or all existing
  `PlayerSeasonStats` fields and document the rationale.
- Team abbreviation is displayed for each player's compared season so team changes remain
  explicit.
- Missing, unavailable, or failed data is never replaced with zeroes or fabricated fallback
  values.
- No colour-only winner treatment, superiority badge, or automatic interpretation is added.
- Existing search, profile, season statistics, career trends, game log, and health flows
  continue to work.

## Settled Product Constraints

- The comparison contains exactly two distinct players when complete.
- Both players and the effective season state needed to reproduce the view live in the URL.
- Existing search behaviour is reused deliberately.
- The view compares regular-season values already represented by the public domain models.
- Team abbreviations remain player-and-season specific.
- The authoritative accessible representation is semantic text or tabular data.
- TASK-007 adds no comparison chart, calculated winner, persistence store, or live data.
- Invalid, incomplete, unknown, unavailable, and failure states remain recoverable.
- The exact URL syntax, season model, endpoint composition, statistic subset, and mobile
  structure remain planning decisions listed below.

## URL And Navigation Requirements

- Both player IDs must be represented in the URL.
- Any season state required to reproduce the comparison must also be represented in the URL.
- Direct navigation and browser refresh must restore valid comparison state.
- URL values are validated with the existing player and season ID rules where applicable.
- Incomplete or invalid URLs render an accessible recoverable state rather than making
  malformed requests.
- Replacing Player A or Player B updates only the intended slot and produces a shareable URL.
- The page provides a real link or control to return to search.
- Each selected player may link to the existing `/players/:playerId` profile route.
- The planning turn must settle the canonical URL shape, path segments versus query
  parameters, parameter names, and history-replacement versus history-push behaviour.
- The planning turn must settle whether reversed player order is semantically meaningful or
  canonicalized. It must avoid redirect loops and produce one deterministic documented rule.

## Player-Selection Requirements

- Reuse the existing debounced, accessible search behaviour or extract a shared primitive
  without changing its established minimum length, trimming, keyboard, pointer, loading,
  empty, and error behaviour.
- Comparison selection must clearly label the Player A and Player B slots.
- A result already selected in the other slot is disabled, omitted, or rejected with a clear
  accessible explanation; the planning turn chooses the interaction.
- With only one selected player, show an incomplete-selection state and prompt for the second
  player. Do not request season statistics for a nonexistent player.
- Users can replace either player without first clearing the entire comparison.
- Replacing one player immediately removes values associated with the previous player and
  prevents stale responses from appearing under the new identity.
- Direct URLs containing identical IDs are invalid and offer a path to replace one player.
- Unknown players are identified per slot without hiding a valid player in the other slot.

## Season Selection And Comparison Rules

The comparison must define deterministic behaviour for differing season availability.
These product decisions are intentionally finalized during the planning-only turn after the
current APIs and UX tradeoffs are evaluated:

1. **Shared versus independent seasons.** Recommended direction: one shared season, because
   aligned labels make the comparison easier to understand and share.
2. **Initial season.** Recommended direction for a shared season: the newest season present
   in both players' validated available-season lists.
3. **No overlapping seasons.** Recommended direction: show an accessible no-common-season
   state while keeping both identities and replacement controls visible; do not silently
   compare different seasons.
4. **One player with no seasons.** Show a player-specific unavailable-data state and do not
   request selected-season statistics for that player.
5. **URL season state.** Recommended direction: encode the chosen shared season so direct
   navigation is reproducible.
6. **Invalid or unavailable URL season.** The plan must choose between canonical fallback to
   the newest valid common season and an explicit unavailable-season state, then define URL
   normalization without loops.
7. **Team changes.** Display each player's team abbreviation from the selected season, not
   only the current profile team.

No selected-season value may be queried until it has been validated against the relevant
available-season data.

## Shared-Contract Requirements

- Reuse `PlayerIdSchema`, `PlayerSummarySchema`, `PlayerProfileSchema`,
  `PlayerSeasonSchema`, `SeasonIdSchema`, and `PlayerSeasonStatsSchema` where their existing
  responsibilities fit.
- Do not duplicate player, team, season, or statistic schemas.
- Any new public schema must be narrowly comparison-specific, composed from existing schemas,
  `.strict()`, and exported with its inferred TypeScript type.
- Public objects reject unknown fields.
- Player and season IDs remain strings.
- Presentation labels, colours, deltas, winner flags, and provider-private fields do not
  enter shared contracts.
- The planning turn must decide whether existing endpoint responses are sufficient or a
  narrowly scoped comparison response contract is justified.

## Backend And Provider Boundary

- Do not require a combined comparison endpoint during this documentation turn.
- The planning turn must compare:
  - composing the existing profile, season-list, and selected-season-statistics endpoints in
    the frontend;
  - adding a dedicated backend comparison endpoint;
  - adding a narrowly scoped comparison contract.
- Prefer existing endpoints unless a dedicated endpoint removes a concrete consistency,
  request-coordination, or validation problem.
- If backend work is justified, routes own request validation, player/season existence
  checks, structured HTTP errors, and outgoing contract validation.
- Providers own fixture lookup, private-to-public mapping, and deterministic ordering.
- Provider-private fields never leave the provider.
- Existing fixture records should be reused rather than creating a second statistical source.
- Any new provider operation must remain implementable by a future live provider.
- Existing backend routes and method-not-allowed behaviour must remain intact.

## Frontend Data Flow

- TanStack Query owns all profile, season, and statistics server state.
- Query keys contain every player ID and season identifier affecting the response.
- Query functions pass TanStack Query's `AbortSignal` to `fetch`.
- Deterministic invalid, not-found, and unavailable responses use `retry: false`.
- Successful responses are runtime-validated with shared schemas.
- Raw backend error messages are never displayed.
- URL state owns shareable player and season selection.
- React state may own only ephemeral interaction details such as an open selector or
  highlighted search option.
- No placeholder or previous data may be shown under a changed player or season label.
- A response is rendered only when its player and season identifiers still match the current
  validated URL/effective comparison state.

## Loading, Empty, Invalid, Unavailable, And Error States

- **No players selected:** explain how to begin and expose Player A selection.
- **One player selected:** preserve that identity and request Player B.
- **Duplicate IDs:** accessible invalid-comparison state with a replacement action.
- **Invalid ID syntax:** do not issue a request for that slot; show a recoverable invalid-link
  state.
- **Unknown player:** identify the unavailable slot and preserve any valid counterpart.
- **Loading identities or seasons:** polite status feedback; no stale comparison values.
- **No season data:** identify the affected player and keep replacement/navigation controls.
- **No common season:** keep both identities visible and explain why comparison values cannot
  be shown.
- **Unavailable selected season:** use the deterministic planning rule; never mislabel other
  season data.
- **Server, network, or contract failure:** generic accessible alert without raw backend text.
- Partial failures must not present an incomplete dataset as a valid complete comparison.

## Stale Data And Race-Condition Prevention

- Changing either player immediately removes comparison values associated with the previous
  player.
- Changing the season immediately removes values associated with the previous season.
- Query keys include all response-defining IDs.
- Abort signals propagate through every request.
- No previous-data preservation or placeholder data may relabel stale values.
- Late responses for replaced players or seasons cannot overwrite the current comparison.
- If multiple existing queries are composed, the view renders complete comparison values only
  after both responses match the current validated comparison state.

## Accessibility Requirements

- Exactly one page-level `<h1>` identifies the comparison page.
- Player A and Player B selectors have distinct visible labels and accessible names.
- Both identities are encoded structurally, not only by position or colour.
- Loading and empty feedback uses appropriate status semantics.
- Invalid and failure feedback uses clear alert/status semantics as appropriate.
- The authoritative representation is semantic text or a comparison table, not a chart.
- Table headers associate every statistic with both player columns and preserve row labels.
- Differences are understandable without colour.
- Keyboard users can select, replace, navigate to profiles, and return to search.
- Focus moves predictably after route entry and major selection/navigation changes without
  stealing focus during background refetches.

## Responsive And Mobile Requirements

- The comparison remains usable at approximately 375 px.
- No page-level horizontal overflow is permitted.
- The planning turn must choose and test a mobile transformation, recommended as labelled
  stacked player values per statistic rather than an unreadably compressed wide table.
- Statistic labels and player identities remain visible in every layout.
- Long names, team labels, loading text, and errors wrap without overlap.
- Desktop may use a side-by-side table or grid, but mobile must preserve the same meaning and
  reading order.

## Testing Requirements

Use the existing Vitest, React Testing Library, jest-dom, jsdom, MSW, and Supertest setup.
Do not add a testing framework during TASK-007.

### Shared Contracts

- Any new schema accepts valid comparison data and rejects unknown fields.
- Duplicate player IDs and invalid player/season identifiers are rejected where the new
  contract owns those invariants.
- Existing profile and season-statistics schemas remain unchanged unless the plan documents a
  necessary compatible extension.

### Backend

Backend tests are required only for backend work selected by the implementation plan. They
must cover:

- Valid known players and season data.
- Invalid and unknown player IDs per slot.
- Duplicate player IDs.
- Invalid, unknown, and non-overlapping seasons where the route owns those rules.
- Shared-contract compliance.
- Provider-private fields not leaking.
- Deterministic fixture behaviour.
- Structured errors without stack traces.
- Route ordering and unsupported methods.
- Existing search, profile, season, trends, game-log, and health routes remaining functional.

If existing endpoints are composed unchanged, preserve their existing backend tests and add
no artificial comparison endpoint tests.

### Frontend

- Direct valid comparison URL restores both players.
- Refresh-compatible route parsing.
- No-player and one-player selection states.
- Both search selectors preserve established debounce and accessibility behaviour.
- Duplicate selection is prevented and duplicate direct URLs are handled.
- Invalid and unknown player handling per slot.
- Replacing Player A and Player B independently.
- Deterministic initial season selection.
- Season change updates the URL and both compared values.
- Differing season lists, no overlap, and one player with no seasons.
- Team changes across seasons display correctly.
- Loading, empty, unavailable, server-error, and invalid-contract states.
- AbortSignal propagation.
- Stale and out-of-order responses cannot replace current player or season data.
- Semantic comparison representation and exactly one `<h1>`.
- Keyboard and pointer operation.
- Approximately 375 px responsive structure with no page-level overflow.
- Links to profiles and return-to-search navigation.
- Existing search-to-profile, profile, season statistics, trends, game log, and health
  behaviour remain functional.

## Manual Verification Requirements

- Start frontend and backend with the root development command.
- Enter comparison through normal navigation.
- Select two distinct players with pointer input and keyboard input.
- Verify duplicate-player prevention.
- Copy a valid comparison URL, open it directly, and refresh it.
- Replace each player independently.
- Verify the default comparison season and change it where supported.
- Verify a pair with overlapping seasons.
- Verify a pair with no overlapping seasons if fixtures support it; otherwise verify through
  automated tests and document the limitation.
- Verify a player with no season data.
- Verify invalid, duplicate, and unknown player URLs.
- Verify player profile links and return-to-search navigation.
- Verify desktop and approximately 375 px layouts.
- Confirm no page-level horizontal overflow and no browser-console errors.
- Stop development processes and confirm project ports are free.

## Security And Repository Hygiene

- Fixture data only; no live NBA API.
- No credentials, tokens, or secrets.
- No real environment files.
- No provider-private fields in public responses or React components.
- No raw backend messages rendered.
- No dependency change unless separately approved during implementation planning.
- No generated output, coverage, preview configuration, or dependency directory tracked.
- No application work outside TASK-007.
- Review the complete Git diff and run `git diff --check`.

## Acceptance Criteria

- [ ] Users can select exactly two distinct fixture-backed players.
- [ ] Existing accessible search behaviour is reused deliberately.
- [ ] Duplicate player selection is prevented and invalid duplicate URLs are handled.
- [ ] A valid comparison is represented by a directly loadable, refresh-safe URL.
- [ ] Both player identities are clearly identified.
- [ ] The deterministic comparison-season rule is implemented.
- [ ] Players with differing season availability are handled correctly.
- [ ] No-common-season and no-season-data states are accessible.
- [ ] Compared regular-season values use validated existing domain models.
- [ ] Team changes across seasons are represented correctly.
- [ ] Loading, incomplete, invalid, unavailable, and failure states are accessible.
- [ ] Stale player or season data is never shown under new labels.
- [ ] TanStack Query manages server state and propagates abort signals.
- [ ] Successful API data is runtime-validated with shared contracts.
- [ ] Provider-private fields do not leak.
- [ ] The authoritative comparison representation is semantic and understandable without
  colour.
- [ ] Exactly one page-level `<h1>` is rendered.
- [ ] Keyboard and pointer selection and replacement work.
- [ ] Desktop and approximately 375 px layouts work without page-level horizontal overflow.
- [ ] Existing search, profile, season statistics, career trends, game log, and health
  behaviour remain functional.
- [ ] No live provider, deployment, authentication, calculated winner, advanced metrics,
  playoff comparison, game comparison, persistence store, Redux, Zustand, second chart
  library, or unrelated redesign is introduced.
- [ ] Formatting passes.
- [ ] Lint passes.
- [ ] Strict type checking passes.
- [ ] Tests pass.
- [ ] Production build passes.
- [ ] Full root validation passes.

## Documentation Completion Criteria

- [x] TASK-006 merge facts are corrected.
- [x] `docs/PROJECT_STATE.md` identifies TASK-007 as active and not implemented.
- [x] README status reflects completed product slices and fixture-backed runtime data.
- [x] TASK-007 scope, constraints, states, verification, and planning questions are recorded.
- [x] No application code, dependency manifest, or lockfile is changed.

## Risks And Planning Questions

The planning-only turn must inspect the current implementation and resolve:

1. Canonical route and parameter names: path segments versus query parameters.
2. Whether player slot order is meaningful or canonicalized.
3. Shared season versus independent seasons; recommended shared season.
4. Default common-season selection and URL normalization.
5. Behaviour for an unavailable URL season.
6. Exact comparison-stat subset from `PlayerSeasonStats`.
7. Whether composing existing endpoints is sufficient.
8. Whether a narrowly scoped shared comparison contract or backend endpoint is justified.
9. How to reuse or extract player search without regressing the home-page combobox.
10. Mobile semantic structure: responsive table transformation versus a labelled grid.
11. Entry points from home and profile pages without unrelated navigation redesign.
12. Fixture additions needed to test no-overlap and no-season cases without creating a
    second data source.
13. Focus management after slot replacement and direct route loading.
14. Query coordination and partial-failure presentation when composing existing endpoints.

Any significant new architecture decision must be appended to `docs/DECISIONS.md`. Ordinary
component, query-key, and file-layout choices do not require an ADR.

## Definition Of Done

- The planning questions above are resolved before implementation.
- The bounded TASK-007 behaviour is implemented without violating architecture boundaries.
- All acceptance criteria are verified.
- Formatting, lint, strict type checking, tests, production build, and full validation pass.
- Manual comparison and responsive checks pass.
- The complete Git diff is reviewed.
- `docs/PROJECT_STATE.md` and this task document are updated with verified results.
- Significant architectural decisions are recorded without rewriting existing ADR history.
- No commit or push occurs unless explicitly instructed.
