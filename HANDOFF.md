# NBA Performance Explorer 2.0 — Engineering Handoff

## Snapshot timestamp / branch / HEAD / base commit

2026-10-14 (Australia/Sydney). Branch `codex/nba-explorer-2-engine`.
Initial HEAD and base: `cd557e4d3cf75e44f930ba75de4ea149a80ccdda`.
No deployment, merge or remote push is authorized or performed.

## Working tree and pending changes

Initial tree was clean. This checkpoint creates expansion documentation; implementation follows.
Verify with `git status --short --branch` before resuming.

## Goal and non-negotiable constraints

Execute the user's fully read 1,107-line Shot 1 specification. Preserve original visual
design and provider, require no mandatory costs, never fabricate statistics, never merge main.
No AGENTS.md was found in the repository or inspected parent directories.

## Verified baseline and last validation results

Node v22.19.0, npm 10.9.3. First sandboxed `npm ci` failed with
`Exit handler never called!`. Authorized retry outside sandbox is in progress.
Baseline `npm run validate` passed outside the Windows sandbox: 190 frontend + 244 backend = 434 tests; all formatting, lint, typechecks and builds passed. Actual repository has later comparison polish
than the brief's hints; PROJECT_STATE records 190 frontend and 244 backend tests.

## Completed commits and shipped-on-branch vertical slices

None yet. Safe branch created; source review completed.

## Current milestone and exact in-progress task

Milestone 0/1: restore locked dependencies, run baseline, establish provenance and
capability contracts, then implement existing-provider analytical slices.

## Feature ledger summary (counts by status)

See `docs/expansion/FEATURE_LEDGER.md`; initially all inventory items unstarted.
Source-dependent items will be downgraded explicitly where terms/access block them.

## Data sources (verified, conditional, blocked, rejected)

Existing NBA Stats provider retained under accepted ADR-013. New ESPN extraction is
rejected by published Disney terms. Broader NBA/CDN republication and play-by-play
require rights review; not enabled. Third-party code licenses do not automatically
license underlying NBA/ESPN data. No new live source claimed verified.

## Architecture and important decisions (with file pointers)

npm workspaces, React 19, Express 5, Zod, TanStack Query and existing PlayerProvider
remain intact. Domain additions will be separate features and strict contracts.
Derived analysis uses observed games only, with missingness and fixture provenance.

## Files changed in current work session

Root handoff and `docs/expansion/*`. Check Git for authoritative current paths.

## Tests and exact commands/results

`npm ci --no-audit --no-fund`: passed outside sandbox, 461 packages. `npm run validate`: sandbox Vitest EPERM temp-file rename; identical elevated run passed (434 tests). Known Vite chunk warning remains.

## Known bugs, security concerns and reliability limitations

Known upstream valid empty career data for NBA player 2544. Free Render access to
new feeds is untested. Current terms prevent assuming publicly reachable data may
be redistributed. Avoid added feed integration until suitable rights are established.

## Protected original UI baseline and visual check status

Baseline screenshots in `docs/assets/`. Protect AppHeader, AppFooter, AppRoot,
styles.css, assets and legacy feature trees. Only additive App.tsx routes planned.
No new screenshot comparison performed yet.

## Next task queue (ordered)

1. Baseline validation and provenance/capability contracts.
2. Explorer hub, player insights and source-aware statistical core.
3. Multi-player comparison with per-player seasons and URL state.
4. Local favorites, saved research, bounded import/export.
5. Integration validation, factual ledger and design handoff.

## Single NEXT ACTION (one exact command or file/task to open)

`npm run validate` after dependency installation finishes.

## Continuation prompt for a new Codex session

CONTINUE FROM HERE: Read this handoff and expansion ledger/audit, verify branch,
HEAD and working tree, then execute NEXT ACTION. Continue complete verified slices
without redesigning legacy pages, fabricating data, deploying or merging.
