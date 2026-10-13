# NBA Performance Explorer 2.0 — Engineering Handoff

## Snapshot timestamp / branch / HEAD / base commit

2026-10-14 Australia/Sydney. Branch `codex/nba-explorer-2-engine`.
Last implementation HEAD `361299a`; base `cd557e4d3cf75e44f930ba75de4ea149a80ccdda`.
Verify full current HEAD with `git rev-parse HEAD`. Not deployed, merged or pushed.

## Working tree and pending changes

Local research and team-directory additions have passed validation and await commit.
Initial tree was clean; verify current Git status before resuming.

## Goal and non-negotiable constraints

Execute the fully read 1,107-line Shot 1 spec. Freeze original visual surfaces,
retain NBA provider, require no mandatory costs, fabricate no facts, never merge main.
No applicable AGENTS.md found in repository or inspected parents.

## Verified baseline and last validation results

Node v22.19.0 / npm 10.9.3. Baseline 434 tests passed. Latest full gate:
238 frontend + 291 backend = 529 passing; format, lint, strict types and builds pass.
First sandbox npm install and Vitest temp-file operations failed; authorized
execution outside sandbox succeeded. No dependency additions. Known Vite warning.

## Completed commits and shipped-on-branch vertical slices

- `5886ea0`: audit, source rights and handoff.
- `361299a`: explorer, player insights, independent-season comparison; full 497-test gate.
- Next checkpoint: My NBA, 30-team sourced static directory; full 529-test gate.

## Current milestone and exact in-progress task

My NBA and teams complete in their documented limited scope. Two-request Totals
field probe passed; next implement separate raw player totals/derived metrics provider.
No legacy provider file modification is required.

## Feature ledger summary (counts by status)

134 inventory IDs in `docs/expansion/FEATURE_LEDGER.md`. Local-first capabilities
and static team identity may be DONE_VERIFIED. New player screens remain fixture
verified pending real API/browser acceptance. League feeds stay explicitly blocked.

## Data sources (verified, conditional, blocked, rejected)

Existing four NBA endpoints passed 12 bounded local checks: Curry search 7,
career 17, 2023-24 games 74; LeBron career 23 (previously empty, now nonempty),
Wembanyama 3, Jordan 15, Doncic 8; profiles 1 each. 288–1,932 ms, no retries.
PerMode=Totals two-request field probe: Curry 17 rows, Doncic 10; numeric
inputs validated, 466/327 ms. NBA usage remains conditional under ADR-013.
MIT nba_api directory contains sourced static identities only, with full notice.
ESPN extraction rejected by terms; broader NBA feeds/archives rights remain gated.
Render access and deployment remain untested in this session.

## Architecture and important decisions (with file pointers)

Separate research contracts/router/math; original PlayerProvider and public
contracts remain intact. Same-origin browser API, capped selections/page sizes,
no automatic retries, legacy process LRU. Legacy upstream timestamps unknown:
servedAt must never be called source freshness. New pages use scoped CSS/lazy routes.
My NBA uses strict versioned JSON and safe local URLs, merges imports, bounds size,
rejects unsafe keys and retains session data if storage is unavailable.

## Files changed in current work session

Contracts, new research/teams backend, optional probe scripts, explorer/insights/lab/
My NBA/team frontend and tests, additive App.tsx routing, composition plumbing,
package scripts, expansion docs. Check Git for authoritative file list.

## Tests and exact commands/results

- `npm ci --no-audit --no-fund`: passed, 461 packages.
- `npm run validate`: baseline 434; insight spine 480; comparison 497; current 529.
- My NBA plus affected insight/lab focused tests: 43 passed.
- Team route tests 8 and team UI tests 3 passed.
- `npm run smoke:free-sources`: 12 existing-source checks passed locally.
- `npx tsx backend/src/scripts/probe-season-totals.ts`: 2 field probes passed.
- `git diff --check`: passed at checkpoints.

## Known bugs, security concerns and reliability limitations

No confirmed critical regression. Upstream can return empty data/timeouts. Current
raw Totals provider not yet implemented. Team rosters/schedules/records absent;
league analytics/standings/games/shots/lineups/historical database remain blocked.
No statistical export without rights review. Current legacy footer has static live
branding; explicit new-page provenance/fixture labels provide actual source context.

## Protected original UI baseline and visual check status

AppHeader, AppFooter, AppRoot, styles.css, legacy feature trees, metadata, images
and screenshot assets unchanged. App.tsx additive lazy routes only. Legacy tests
pass. No before/after browser or pixel comparison yet; diff-only preservation.

## Next task queue (ordered)

1. Raw totals provider, derived TS/eFG/AST-TO/per36 and strict source reconciliation.
2. Selected-cohort analytics with explicit sample/formulas, scatter/table and weights.
3. Real local API acceptance/browser journeys and integration safeguards.
4. Final full gate, ledger counts, API/math/source docs and Claude handoff.

## Single NEXT ACTION (one exact command or file/task to open)

Implement `backend/src/features/research/season-totals-provider.ts` and strict contracts/tests.

## Continuation prompt for a new Codex session

CONTINUE FROM HERE: Read this handoff, ledger and source audit, verify HEAD/branch/tree,
then execute NEXT ACTION. Continue complete verified slices, preserve legacy design,
and never merge/deploy, invent NBA facts or assume broader feed rights.

## Raw totals / selected-cohort checkpoint — 2026-10-14

New raw totals provider and analytics lab implemented. Full gate before final
identity guards: 247 frontend + 319 backend = 566 tests passed. Identity guards
now have focused validation. Live `npm run smoke:engine` passed 16 public API/SPA
checks locally: 74 games, 10-game window, 2 BOS games, verified raw formulas,
3 available comparison/analytics slots, 30 teams, 6 direct refresh routes. Render
untested. Browser verified search, filters, 3-player compare, signed TS/AST-TO
weights, saved analytics, two player favorites and a team, reload and valid/invalid
JSON import/export. Phone 390x844: no page overflow; table keyboard scroll 39.5px.
One stale lazy chunk after rebuilding assets recovered on reload; record in Shot 3.
No protected visual-file diff. Next immediate action: finalize expansion docs and
commit the verified raw-stat/analytics checkpoint. Full platform remains incomplete.
