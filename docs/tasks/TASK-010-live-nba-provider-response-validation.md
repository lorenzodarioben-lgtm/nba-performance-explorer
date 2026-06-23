# TASK-010 — Live NBA Provider Response Validation and Compatibility

- **Milestone:** Live NBA Provider Response Validation and Compatibility
- **Status:** Stages A–E complete; live NBA.com mode verified in production. Finalizing the live configuration in `render.yaml`.
- **Branch:** Stages A & D merged via pull request #12 (`71b61e9`); Stage C via pull request #13 (`5518234`); live-config finalization on `chore/enable-live-nba-provider-production`
- **Provider under investigation:** `NbaStatsPlayerProvider` (direct NBA.com Stats access, ADR-013)

> Read `AGENTS.md`, `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`, and
> `docs/DECISIONS.md` before any work. TASK-001 through TASK-009 are completed and merged. This
> document defines scope and a staged, evidence-driven approach only. It changes no production
> code. The committed repository, Git history, source, and tests are authoritative wherever this
> document or any other instruction conflicts with them.

## Objective

Diagnose and fix the evidence-backed cause of the live-provider `PROVIDER_INVALID_RESPONSE`
(HTTP 502) that occurred during real player search on Render, then strengthen the
deployment-host connectivity gate so it exercises the same parsing and mapping path the
application uses. Production must remain in the verified fixture-backed mode until a separately
approved live re-test from Render succeeds.

This task must not invent a parser fix before enough sanitized evidence proves the legitimate
response variation. HTTP and JSON reachability do **not** prove parser compatibility.

## Verified Starting State

Confirmed through Git and a full local run on 2026-06-23 before this task was defined:

- `main` is clean and synchronized with `origin/main` at `fa437d3`
  (merge of pull request #11, "docs: finalize TASK-009 post-merge state").
- Pull request #10 ("feat: prepare production deployment") merged in `9c27e3c`.
- TASK-009 is complete; Render tracks `main` and is live and healthy in fixture mode at
  `https://nba-performance-explorer.onrender.com`.
- Baseline `npm run validate` passes: Prettier check, ESLint, strict frontend and backend
  type-checking, **139 frontend tests**, **186 backend tests** (**325 total**), and the
  production build (frontend bundle 714.05 KB raw / 212.81 KB gzip; CSS 13.47 KB raw / 3.46 KB
  gzip; the existing Vite chunk-size warning remains known and non-blocking).
- `git diff --check` is clean.
- No automated test contacts NBA.com.

(Observation, non-blocking: several fully merged local and remote task branches from earlier
tasks still exist — e.g. `feature/live-nba-provider`, `feature/player-comparison`,
`feature/player-game-log`, and matching `origin/*` branches. They are all merged into `main` and
do not affect this task. Branch cleanup is out of scope here.)

## Observed Failure (Evidence)

Recorded in `docs/PROJECT_STATE.md`, `docs/DECISIONS.md` (ADR-014 verified outcome), the
TASK-009 document, and `README.md`:

- The Render-host connectivity gate returned `PASS` for all four approved endpoint families
  (`commonallplayers`, `commonplayerinfo`, `playercareerstats`, `playergamelog`) at the
  HTTP-success and JSON-response level.
- Render was switched to `NBA_DATA_PROVIDER=nba-stats` with the fixture allowance removed. The
  backend started successfully and reported `provider: nba-stats`.
- A real application player-search request then failed with HTTP 502 and the public body:

  ```json
  { "error": { "code": "PROVIDER_INVALID_RESPONSE", "message": "The NBA data source returned an unexpected response.", "status": 502 } }
  ```

- Production was immediately rolled back to fixture mode (`NBA_DATA_PROVIDER=fixture`,
  `NBA_ALLOW_FIXTURE_IN_PRODUCTION=true`) and verified healthy. No silent fallback and no
  blocking-evasion mechanism was introduced.

This establishes a precise, repository-confirmed distinction: Render can reach NBA.com and the
endpoint returned HTTP/JSON that passed the coarse gate, but the application's strict
application-level validation or mapping rejected the response. The exact legitimate shape
difference is **not yet proven**.

## Why the Gate Passed While the Application Failed (Architecture, Confirmed by Source)

The gate and the application share the HTTP client but diverge immediately after it:

- `backend/src/features/players/nba-stats/nba-stats-http-client.ts` — `fetchEndpoint` validates
  only that the request resolved, `response.ok` is true, the `content-type` includes `json`, and
  the body parses as JSON. It returns the parsed body as `unknown`. It performs **no** envelope,
  result-set, column, row-width, or cell-type validation.
- `backend/src/scripts/nba-connectivity-gate.ts` — `runConnectivityGate` calls **only**
  `client.fetchEndpoint(...)` for each endpoint and treats any resolved value as `PASS`. It never
  calls `selectResultSet`, `parseDirectory`, or any mapper. So a gate `PASS` proves only
  "HTTP 2xx + JSON content type + parseable JSON".
- Player search uses a strictly deeper path:
  `NbaStatsPlayerProvider.searchPlayers` → `loadDirectory` →
  `fetchEndpoint('commonallplayers', { LeagueID: '00', Season: <current YYYY-YY>, IsOnlyCurrentSeason: '0' })`
  → `parseDirectory(body)` in `nba-stats-mappers.ts`, which calls
  `selectResultSet(body, 'CommonAllPlayers', DIRECTORY_COLUMNS)` in `nba-stats-response.ts` and
  then maps every row with the typed cell accessors.

The strict checks that the gate skips and the application enforces:

- `EnvelopeSchema` (`nba-stats-response.ts`) requires a top-level **`resultSets`** (plural) array;
  each result set requires `name: string`, `headers: string[]`, and `rowSet: unknown[][]`.
- `selectResultSet` rejects duplicate result-set names, requires every row width to equal its
  result set's header width across **all** result sets, requires the named result set to appear
  exactly once, and requires every listed required column exactly once.
- `parseDirectory` (`commonallplayers`) requires result set `CommonAllPlayers` and these 16
  columns: `PERSON_ID`, `DISPLAY_LAST_COMMA_FIRST`, `DISPLAY_FIRST_LAST`, `ROSTERSTATUS`,
  `FROM_YEAR`, `TO_YEAR`, `PLAYERCODE`, `PLAYER_SLUG`, `TEAM_ID`, `TEAM_CITY`, `TEAM_NAME`,
  `TEAM_ABBREVIATION`, `TEAM_CODE`, `TEAM_SLUG`, `GAMES_PLAYED_FLAG`, `OTHERLEAGUE_EXPERIENCE_CH`.
  Per row it requires `PERSON_ID` to be a finite, safe, positive integer; `DISPLAY_LAST_COMMA_FIRST`
  to be a string containing a comma with a non-empty surname and first name;
  `ROSTERSTATUS` to be a finite number equal to exactly `0` or `1`; and reads `TEAM_ID` as a finite
  number. It **throws on the first non-conforming row**, and `IsOnlyCurrentSeason=0` returns the
  full historical directory (thousands of rows), so a single unexpected row aborts the whole search.

The public error is intentionally generic (`provider-error.ts` maps `PROVIDER_INVALID_RESPONSE`
to 502 with a fixed message), and the internal message that records *which* check failed is
never exposed to the client. Production therefore produced no diagnostic detail about the
specific cause. This is correct for security but is exactly why Stage A diagnostics are required.

## What Is NOT Yet Known (Unknowns)

The repository contains **no** captured sanitized sample of the production `commonallplayers`
response, so the following are unproven and must not be assumed:

- Whether the rejection happens in `selectResultSet` (envelope/result-set/column/row-width) or in
  the per-row mapping (cell type or value-format).
- Which specific column, row, cell type, or value-format triggered the rejection.
- Whether the deployed `commonallplayers` response from Render's network differs structurally from
  the shapes assumed by the offline tests, or differs only in a small number of edge-case rows.
- Whether the other three endpoints would also fail the application path from Render (search
  failed first, so the rest were never exercised in live mode).

## Candidate Failure Points (Hypotheses — confirm with evidence; do not assume)

Grounded in the source above, the rejection for `commonallplayers` must be one (or more) of:

1. **Envelope key mismatch** — the body does not expose a top-level `resultSets` array (for
   example a singular `resultSet`, or a different envelope), failing `EnvelopeSchema`.
2. **Result-set name mismatch** — no result set named exactly `CommonAllPlayers`.
3. **Missing/renamed required column** — one of the 16 directory columns is absent or renamed
   (for example `OTHERLEAGUE_EXPERIENCE_CH`, `PLAYER_SLUG`, or `TEAM_SLUG`).
4. **Row-width mismatch** — at least one row's length differs from the header count.
5. **Cell-type mismatch** — a consumed cell has an unexpected primitive type (for example
   `PERSON_ID` or `ROSTERSTATUS` or `TEAM_ID` arriving as a string, or a `null` where a number is
   required).
6. **Value-format mismatch** — a consumed cell is the right type but an out-of-contract value (for
   example `ROSTERSTATUS` not equal to `0`/`1`, a non-positive/non-safe `PERSON_ID`, or a
   `DISPLAY_LAST_COMMA_FIRST` lacking a comma or with an empty surname/first name, such as a
   single-name or placeholder roster entry).

Stage A diagnostics must be able to discriminate among these without exposing player data. The
fix in Stage C addresses only the legitimate variation that the evidence proves.

## Security, Privacy, and Operational Constraints (Mandatory)

These are hard requirements and apply to every stage:

- Keep public production in fixture mode throughout the investigation. Do not change Render to the
  live provider merely to experiment.
- Do not introduce any silent fixture fallback on provider failure. A configured `nba-stats`
  provider must still surface a stable provider error.
- Do not weaken validation to broadly accept arbitrary `unknown` data. Strict validation and the
  existing shared contracts and provider-error semantics must be preserved.
- Malformed or structurally unsafe responses must still fail with `PROVIDER_INVALID_RESPONSE`.
- Diagnostics and logs must never include: complete upstream response bodies, complete rows,
  player data values, cookies, request or response headers, authentication or session material, or
  sensitive query parameters or full upstream URLs.
- No proxies, IP rotation, residential IPs, CAPTCHA bypass, WAF bypass, cookie harvesting, browser
  impersonation beyond the already-approved static header set, or any other blocking-evasion
  mechanism. No scraping workaround outside the existing provider architecture.
- Do not expose raw upstream data to the frontend. The internal-domain-model boundary
  (ARCHITECTURE.md) stays intact.
- Do not commit secrets or production credentials. NBA.com Stats requires none; none may be added.
- Tests must remain deterministic and must never depend on the live NBA network.
- Any deployment-host diagnostic run must be small, explicit, sanitized, and manually authorized,
  and must preserve the working fixture deployment if it fails.

## Sanitized Diagnostic Metadata (Allow / Forbid)

When diagnostics are explicitly enabled for a controlled run, only this metadata may be produced:

**Allowed**

- Endpoint name (for example `commonallplayers`).
- HTTP status code.
- Response content type.
- Top-level property names of the parsed body (key names only).
- Whether a `resultSets` (plural) or `resultSet` (singular) property exists.
- Result-set names.
- Per-result-set header count and row count.
- The header/column **names** the parser requires and which required names are missing or
  duplicated (names are schema, not player data).
- For a rejected row: the column where rejection occurred, the JavaScript `typeof` (or `null`) of
  that cell, and the parser stage that failed (envelope / result-set selection / column check /
  row-width / cell-type / value-format / mapped-schema).
- Zod issue `code` and `path` values (paths are structural indices/keys, not cell values).
- Counts and categories only.

**Forbidden**

- Complete or partial response bodies and complete rows.
- Any player data value (names, ids, teams, dates, statistics, or any cell contents).
- Cookies, request/response headers, tokens, or session material.
- Full upstream URLs or sensitive query parameters.

Diagnostics must be **disabled by default** and enabled only by an explicit, strictly parsed
configuration flag (proposed `NBA_STATS_DIAGNOSTICS=true|false`, default off, parsed with the
same fail-fast strictness as `NBA_ALLOW_FIXTURE_IN_PRODUCTION`). Diagnostics must never change
control flow, never relax validation, and never alter the public error surface.

## Staged Approach

### Stage A — Safe Diagnostics

Introduce narrowly scoped, sanitized diagnostics that can identify where a response is rejected,
emitting only the allowed metadata above. Diagnostics are off by default and gated by the explicit
flag. They are additive: they must not change parsing decisions, the public error body, caching,
or any existing behavior when the flag is off. Add deterministic unit tests (mocked inputs only)
proving the diagnostics emit the allowed metadata and never emit forbidden content for
representative envelope, result-set, column, row-width, cell-type, and value-format failures.

### Stage B — Evidence Collection

Use the strengthened deployment-host diagnostic/gate (Stage D) to obtain only the minimum
sanitized shape metadata required to understand the mismatch for `commonallplayers` (and, if
reached, the other endpoints). Do not fabricate a response fixture from assumptions.

If the repository does not already contain sufficient evidence after Stages A and D are
implemented and validated, **stop** and clearly state the exact controlled Render run required,
including the precise command and the sanitized fields it will report. Implementation of the
Stage C fix must not begin until the evidence proves the legitimate variation.

### Stage C — Compatibility Fix

Once the legitimate response variation is proven by sanitized evidence:

- Encode the observed variation as a sanitized, deterministic test fixture (synthetic values; no
  captured player data).
- Update only the narrow schema/parser/mapper boundary needed to accept the proven legitimate
  variation.
- Preserve strict validation, the existing shared Zod contracts, and the existing provider-error
  semantics (timeout → 504, unavailable → 503, invalid → 502).
- Ensure malformed or structurally unsafe responses still fail with `PROVIDER_INVALID_RESPONSE`.
- Introduce no broad or permissive `unknown` parsing and no `any`.
- Route player search (and any other affected flow) through the corrected path.

### Stage D — Gate Strengthening

Strengthen `nba-connectivity-gate.ts` so each endpoint check exercises the **same** response
schema/parser and mapping path the application uses (for `commonallplayers`, the `parseDirectory`
path used by player search; correspondingly for the other three endpoints), rather than only
checking HTTP 200 plus generic JSON. The gate must report `FAIL` whenever the production parser
would raise `PROVIDER_INVALID_RESPONSE`, and it must still emit only sanitized PASS/FAIL output
(no bodies, headers, cookies, or sensitive parameters). Update the gate's offline tests (mocked
client) to cover both a valid parsed response and a response that the application parser rejects,
asserting the gate fails in the latter case.

### Stage E — Controlled Live Re-test

Only after code review, full validation, merge readiness, and explicit human approval:

- Run the strengthened gate from Render and confirm it passes the real parsing path.
- Enable the live provider on Render and verify **player search first**.
- Then verify the remaining supported flows (profile, season statistics, career trends, game log,
  two-player comparison).
- Immediately return to fixture mode if any real flow fails, preserving the working deployment.
- Record the outcome accurately in `docs/PROJECT_STATE.md`, `docs/DECISIONS.md` (ADR-014
  consequences/outcome, appended — do not rewrite history), the TASK-010 result section, and
  `README.md`, using evidence rather than assumptions.

Production provider selection must never change automatically as part of normal application
startup or deployment.

## Implementation Boundaries

- Touch only the live-provider validation/mapping boundary, the diagnostics, the connectivity
  gate, their tests, and documentation. Do not modify the fixture provider, the `PlayerProvider`
  interface, the routes, the cache design, the frontend, or the shared public contracts unless the
  proven evidence strictly requires a minimal, backward-compatible contract change (which would
  require its own ADR and explicit approval).
- No new product feature, no unrelated refactor, no dependency additions beyond what a proven fix
  strictly requires (and any addition must be justified in `docs/DECISIONS.md` first).
- TypeScript strict mode stays on; avoid `any` (document and narrow if ever unavoidable).
- No secret, credential, raw upstream payload, or real `.env` enters the repository.

## Deterministic Testing Requirements

- Every test remains offline; none contacts NBA.com. The HTTP client tests mock `globalThis.fetch`,
  the provider tests inject a fake client, and the gate tests inject a fake client.
- The proven legitimate variation gains a sanitized, synthetic, deterministic fixture and test.
- Existing supported response shapes continue to pass unchanged.
- Malformed/structurally unsafe responses continue to fail with `PROVIDER_INVALID_RESPONSE`.
- Diagnostics tests assert allowed metadata is present and forbidden content is absent.
- Strengthened-gate tests assert PASS on a valid parsed response and FAIL when the application
  parser would reject.
- The full suite (frontend + backend) must pass, and the count must be reported honestly.

## Strengthened Gate Requirements (Summary)

- The gate must test more than "HTTP 200 plus some JSON".
- It must exercise the production response schema/parser and mapping path, especially for player
  search via `parseDirectory`.
- It must fail if the production parser would fail.
- It must remain sanitized, with no bodies, rows, player values, headers, cookies, or sensitive
  parameters in its output, and a non-zero exit on any failure.

## Controlled Render Verification and Rollback Procedure

- Keep `main`/production fixture-backed until Stage E is explicitly approved.
- For any diagnostic or live run on Render: enable only the explicit, sanitized diagnostic flag or
  provider change required, run the minimum sample, capture only allowed metadata, and record host,
  date, and sanitized outcomes.
- Verify player search first; if it fails, stop and roll back to fixture mode immediately
  (`NBA_DATA_PROVIDER=fixture`, `NBA_ALLOW_FIXTURE_IN_PRODUCTION=true`), then confirm health and
  fixture-backed search still work.
- A failed live experiment must always leave the public fixture deployment working.
- Rollback options: revert the Render environment to fixture mode (and redeploy), or
  `git revert` the offending commit on `main` (Render auto-redeploys). Record the known-good deploy.

## Acceptance Criteria

- [ ] The exact validation/parser failure can be identified using sanitized metadata.
- [ ] Diagnostics reveal no complete upstream payloads, rows, player values, cookies, headers,
      tokens, or sensitive parameters.
- [ ] A legitimate observed NBA response variation has sanitized, deterministic test coverage.
- [ ] Existing supported response shapes continue to pass.
- [ ] Malformed or structurally unsafe responses continue to fail with `PROVIDER_INVALID_RESPONSE`.
- [ ] Player search uses the corrected parser/mapping path.
- [ ] The connectivity gate exercises the production parsing path rather than only generic JSON.
- [ ] The gate fails if the production parser would fail.
- [ ] No silent fixture fallback is introduced.
- [ ] Production remains fixture-backed until a separately verified live-provider re-test succeeds.
- [ ] Formatting, lint, strict type checking, all tests, the production build, and full validation
      pass, and `git diff --check` passes.
- [ ] Relevant documentation is updated with evidence rather than assumptions.
- [ ] No unrelated refactoring or new product feature is included.

## Explicit Out of Scope

- New product features, authentication, accounts, favourites, predictions, rankings, advanced
  metrics, play-by-play, shot charts, or any frontend redesign.
- Replacing React, Express, TanStack Query, the provider boundary, or NBA.com as the source.
- Any blocking-evasion mechanism (proxy, IP rotation, residential IP, cookie harvesting, CAPTCHA
  bypass, WAF bypass) or scraping workaround outside the provider architecture.
- Adding new upstream endpoints beyond the four approved families.
- A shared/distributed cache, a database, or bundle optimization.
- Broad permissive parsing or relaxing the shared contracts beyond a proven, minimal,
  backward-compatible change recorded as its own ADR.
- Branch cleanup of pre-existing merged task branches.
- Automatically changing the production provider during startup or deployment.

## Definition of Done

TASK-010 is done only when: sanitized diagnostics can pinpoint the failure stage; the proven
legitimate response variation has deterministic offline coverage and the narrow parser/mapper
boundary accepts it while still rejecting malformed responses with `PROVIDER_INVALID_RESPONSE`;
player search uses the corrected path; the connectivity gate exercises and fails on the real
application parsing path; no silent fallback or blocking-evasion is introduced; the full offline
suite, formatting, lint, strict type checking, the production build, and full validation pass with
`git diff --check` clean; production remains fixture-backed pending a separately approved Render
re-test; documentation records verified outcomes and limitations; the complete diff is reviewed;
and no commit or push occurs without explicit instruction.

## Implementation Status — Stage A and Stage D (2026-06-23)

Stage A (safe sanitized diagnostics) and Stage D (gate strengthening) were implemented, hardened
under an adversarial pre-push review, and merged into `main` via pull request #12 (`71b61e9`).
Stage B (one controlled, sanitized Render diagnostic run) is now complete and proved the legitimate
`commonallplayers` variation (see "Stage B — Completed" below). Stage C (directory-name
compatibility) is active on branch `fix/live-nba-directory-name-compatibility`; Stage E has not
started. Production remains fixture-backed; the live provider is **not** fixed and live production
mode is **not** ready.

### Stage A — implemented

- New `NBA_STATS_DIAGNOSTICS` configuration flag parsed strictly (omitted or `false` → off; `true`
  → on; any other value fails startup), alongside the existing strict switches. Off by default.
- New backend-private `nba-stats-diagnostics.ts` module: a structural-only `ResponseDiagnostic`
  type, the `primitiveCategory` / `topLevelPropertyNames` / `hasProperty` / `summarizeZodIssues`
  helpers, a `DiagnosticReporter` interface, a `noopDiagnosticReporter`, and a
  `createConsoleDiagnosticReporter`.
- `selectResultSet`, the typed cell accessors, `validateMapped`, and the value-format checks in the
  mappers now attach a sanitized diagnostic to the thrown `ProviderError` at every
  `PROVIDER_INVALID_RESPONSE` site (envelope, result-set, required-columns, row-width, cell-type,
  value-format, mapped-schema stages). The throw conditions, messages, and public error are
  unchanged; the diagnostic carries only structural metadata.
- The live provider emits a diagnostic (enriched with the safe upstream endpoint name) through an
  injected reporter when a response is rejected. The reporter is a no-op unless
  `NBA_STATS_DIAGNOSTICS=true`, wired at the composition root. Emission never changes whether
  parsing succeeds or fails and never alters the public API error response.

### Stage D — implemented

- `nba-connectivity-gate.ts` now runs the **same** production parser/mapper per endpoint
  (`parseDirectory`, `mapPlayerProfile`, `parseCareerSeasons`, `mapGameLog`) after the HTTP/JSON
  check, reusing the exported functions (no duplicated parser logic). A check passes only when the
  real mapper accepts the body and fails (sanitized) when it would raise
  `PROVIDER_INVALID_RESPONSE`. A `gateExitCode` helper makes the non-zero-on-failure exit testable.
- The gate keeps its small request scope, timeout, and manual-invocation guard; it prints only the
  stable code plus the structural diagnostic, never bodies, rows, player values, headers, cookies,
  or full URLs.

### Files

- Created: `backend/src/features/players/nba-stats/nba-stats-diagnostics.ts` (+ test).
- Modified: `backend/src/config/player-provider-config.ts` (+ test),
  `backend/src/features/players/provider-error.ts`,
  `backend/src/features/players/nba-stats/nba-stats-response.ts`,
  `backend/src/features/players/nba-stats/nba-stats-mappers.ts`,
  `backend/src/features/players/nba-stats/nba-stats-player-provider.ts` (+ test),
  `backend/src/features/players/player-provider-factory.ts` (+ test),
  `backend/src/scripts/nba-connectivity-gate.ts` (+ test), `backend/.env.example`.
- No change to shared contracts, the frontend, the fixture provider, the `PlayerProvider`
  interface, the routes, the cache, `render.yaml`, or any Render setting.

### Verification (all offline)

- Formatting, ESLint, strict frontend and backend type-checking, and the production build pass.
- Tests at the Stage A/D commit: 139 frontend and 217 backend (356 total). The adversarial-review
  hardening added 14 more backend tests, so the merged `main` baseline (`71b61e9`) is 139 frontend
  and 231 backend (370 total), all passing. No test contacts NBA.com.
- `git diff --check` clean. The frontend bundle is unchanged (backend-only change).

## Stage B — Completed (2026-06-23)

One controlled, sanitized diagnostic run was performed from the Render production host with explicit
authorization, while production continued serving in fixture mode.

**Execution method.** Render Shell and One-Off Jobs are Starter-only (unavailable on the free
instance), so the strengthened gate was run via a temporary Start Command override (the safest
remaining option, with no `render.yaml` change):

```sh
sh -c 'node backend/dist/scripts/nba-connectivity-gate.js; exec node backend/dist/server.js'
```

The gate ran once, then `exec`d the normal fixture server. The original Start Command
(`node backend/dist/server.js`) was restored immediately afterward. The environment was unchanged
(`NBA_DATA_PROVIDER=fixture`, `NBA_ALLOW_FIXTURE_IN_PRODUCTION=true`, `NBA_STATS_TIMEOUT_MS=10000`,
`FRONTEND_DIST=frontend/dist`); the live provider was never enabled and `NBA_STATS_DIAGNOSTICS` was
not set.

**Gate results (sanitized).**

| Endpoint | Result |
|---|---|
| `commonallplayers` | FAIL — `PROVIDER_INVALID_RESPONSE` |
| `commonplayerinfo` | PASS — reachable and parsed |
| `playercareerstats` | PASS — reachable and parsed |
| `playergamelog` | PASS — reachable and parsed |

**Exact sanitized `commonallplayers` diagnostic.**

```json
{
  "stage": "value-format",
  "category": "invalid-last-comma-first-name",
  "expectedResultSet": "CommonAllPlayers",
  "rejectedColumn": "DISPLAY_LAST_COMMA_FIRST",
  "rejectedRowIndex": 1986,
  "valueCategory": "string",
  "endpoint": "commonallplayers"
}
```

**Confirmed facts (explicit in the output).** The envelope parsed, `CommonAllPlayers` existed, the
required columns existed, and row widths were valid (the parse reached the per-row value check).
`DISPLAY_LAST_COMMA_FIRST` at row index 1986 is a **string** (`valueCategory: "string"`) whose
value-format failed the `invalid-last-comma-first-name` check — i.e. it has no comma, or begins with
a comma (empty surname). The other three endpoint parsers succeeded.

**Not confirmed (no claim made).** The actual player identity; the actual cell value; whether the
string had no comma or began with a comma; and whether additional incompatible rows exist after row
1986 (the parser aborts on the first one).

**Privacy.** No response body, raw row, raw cell value, player name, player ID, team ID, cookie,
header, token, URL, or query value was captured or recorded — only bounded structural fields.

**Restoration verified.** The Start Command was restored to `node backend/dist/server.js`; the new
deploy went live with `provider: fixture` and ran no gate; `GET /api/health` returned HTTP 200; and
the fixture-backed `?search=lebron` returned HTTP 200 with LeBron James. The local repository
remained clean and unchanged throughout.

## Stage C — Completed (merged via pull request #13, `5518234`)

Stage C implemented the narrow directory-name compatibility fix proven by the Stage B evidence: when
`DISPLAY_LAST_COMMA_FIRST` is a string without a usable comma, the already-present `DISPLAY_FIRST_LAST`
full display name is used as the alternate name source (for the full name and both search name
parts, with no invented surname/given split), so player search no longer aborts. Standard
`"Surname, First"` values, all other parsers, and provider-error semantics are unchanged; rows with
neither a usable comma name nor a usable display name fail with a sanitized `unusable-directory-name`
diagnostic, and other malformed rows still fail with `PROVIDER_INVALID_RESPONSE`. Merged with the
suite at 139 frontend and 244 backend tests (383 total) after an adversarial pre-push review.

## Stage E — Completed (2026-06-24)

Controlled live verification was performed from the Render production host with explicit
authorization, on the merged `main` build `5518234`.

**Gate re-run (temporary Start Command method, no `render.yaml` change).** The strengthened gate was
run via `sh -c 'node backend/dist/scripts/nba-connectivity-gate.js; exec node backend/dist/server.js'`
with the environment unchanged (fixture). All four endpoints **PASSED**, including `commonallplayers`
— now run through the Stage C-fixed `parseDirectory` over the whole live directory:

| Endpoint | Stage B | Stage E |
|---|---|---|
| `commonallplayers` | FAIL (`invalid-last-comma-first-name`) | **PASS** |
| `commonplayerinfo` | PASS | PASS |
| `playercareerstats` | PASS | PASS |
| `playergamelog` | PASS | PASS |

The gate passing over the entire directory resolves the Stage C "are there other incompatible rows"
uncertainty: the full live `commonallplayers` directory now parses end-to-end. The normal Start
Command (`node backend/dist/server.js`) was restored immediately and the service reverified
(`provider: fixture`, `/api/health` 200, fixture search 200).

**Live-provider verification.** With explicit approval, production was switched to the live provider
via Render dashboard environment variables (`NBA_DATA_PROVIDER=nba-stats`,
`NBA_ALLOW_FIXTURE_IN_PRODUCTION=false`, `NBA_STATS_TIMEOUT_MS=10000`, normal Start Command). Logs
reported `provider: nba-stats`. All eight public flows were verified over live data (HTTP 200): health;
player search; player profile; available seasons; selected-season statistics; career trends; game
log; and two-player comparison (data composed from a second live player). Only sanitized structural
summaries (status codes, counts, key counts, public ids, season labels) were recorded — no raw
upstream body, row, player value, cookie, header, token, URL, or query was captured.

**Outcome.** The live provider works end-to-end in production. The project owner chose to keep
production live-backed; this is finalized by updating `render.yaml` to the live configuration (this
branch) so the Blueprint source of truth matches the verified Render state. No application code or
parser was changed in Stage E. Per ADR-013 the accepted risks remain (NBA.com terms; shared cloud IPs
may be blocked or time out later); the documented rollback is `NBA_DATA_PROVIDER=fixture` with
`NBA_ALLOW_FIXTURE_IN_PRODUCTION=true`.
