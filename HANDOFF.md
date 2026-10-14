# NBA Performance Explorer 3.0 — expansion handoff (live)

> The live handoff for the 3.0 expansion. The 2.0 redesign handoff and the original Codex
> engineering handoff follow below unchanged and stay authoritative for their scope.

- **Branch:** `claude/nba-explorer-3-expansion`, cut from the approved 2.0 checkpoint `0aa2717`.
  Never commit to `main`, `codex/nba-explorer-2-engine` or `claude/nba-explorer-design`; no
  merge, PR to `main` or deploy.
- **HEAD:** see `git log -1`; every verified stage commit is listed below.
- **Working tree:** clean after each commit (a local, untracked `.claude/launch.json` preview
  config may exist on the development machine; never commit it).
- **Evidence:** `docs/expansion3/VERIFICATION_LOG.md` (per-stage results) and
  `docs/expansion3/FEATURE_INVENTORY.md` (inventory and backlog).
- **Design:** the Arena & Film Room system is final. New modules reuse its tokens, slates,
  tapes, scoreboard/statgrid/ladder modules and motion primitives; new CSS lives in
  `frontend/src/design/intel.css` and `playoffs.css`, with additions in `studio.css` and
  `history.css`.

## Completed in 3.0

| Stage | Scope                                                                       | Commit    |
| ----- | --------------------------------------------------------------------------- | --------- |
| 0     | 16 → 0 npm audit findings (in-range updates); Windows module-case self-test | `fd2d2c0` |
| 1     | Team season intelligence (`/teams/:id/season`) and the standings race       | `a9c6d0b` |
| 2     | 2024 playoff bracket and series explorer (`/games/bracket`)                 | `7e8e2cb` |
| 3     | Shot Studio: distance profiles, clickable zones, zone strip, saved views    | `46e5e67` |
| 4     | Player hub "2023–24" room (`/players/:id/archive`) with similar seasons     | `dd29902` |
| 5     | Search reaches archive players and new rooms; My NBA research board + notes | `0526b32` |
| 6–7   | e2e on new routes (2 a11y defects fixed); 2023–24 season research hub       | `5845b23` |

New APIs: `GET /api/recorded/team-season?team=`, `GET /api/recorded/standings-race?conference=`,
`GET /api/games/bracket`, `GET /api/recorded/player-season?player=&minGames=`. Shot groups gained
`meanDistanceFeet` and `distances`; research bookmarks gained an optional `note` (schema stays
version 1). All derivations live in backend domain modules with unit tests; the UI presents them.

## Verified state

- `npm run validate` exit 0: 382 frontend and 432 backend tests (2.0 baseline 347/413), lint 0
  errors (13 pre-existing react-refresh warnings), typecheck, builds and module-case check pass.
- `npm run e2e`: 133 passed, 0 failed (2.0: 118) — smoke on desktop and phone plus axe scans for
  every route, including the five 3.0 routes.
- `npm audit`: 0 vulnerabilities (full tree and production-only).
- Bundle: initial JS 197.2 kB gzip (2.0: 196.5 kB); CSS 26.8 kB (2.0: 23.7 kB); new pages are
  lazy chunks of 3.5–5.6 kB gzip.
- Visual checks at 1280 and 390 px for every new page; details and fixes in the log.

## Constraints and data notes

- NBA Stats timed out from the development machine; new work uses the committed recorded
  archives and the Wikipedia playoff snapshot. Quarantined games keep their slot but never get
  a score. Rest, streaks and rolling margins are withheld when chronology is unknown.
- Bracket winners require a fourth win in the series' last recorded game; rounds are derived
  from team series order and cross-checked against NBA game-ID round digits. No seeds.
- Similar seasons are equal-weight z-score distance in a stated cohort; the UI calls them a
  resemblance, never a quality judgement. Recorded leaders use the archive's games rule, not the
  official one, and say so.
- Tests that were re-expressed (never weakened) are listed in the log: the Shot Studio title
  count and the search "warriors" option.
- Commits carry no AI co-author trailer (owner preference).
- npm 10.9.3 crashes on `npm update` (arborist edgesOut); use `npx npm@11 update <pkg>` for
  targeted updates, then `npm ci` with the project npm.

## Next actions (in order)

1. Two-team season comparison in `/lab/teams` using the team-season endpoint (ribbons, splits
   and season series side by side).
2. Playoff game pages: quarter-by-quarter cumulative margin and "series so far" context.
3. A formula and glossary page listing every derived metric with definition, inputs and source.
4. Standings race: games-behind view and a play-in line overlay.
5. After each UI change re-run `npm run e2e`; keep the verification log current.

Continuation: `git checkout claude/nba-explorer-3-expansion && npm ci && npm run validate`.
For live checks run the backend on 3001 (`PORT=3001 npm run dev:backend`) and the frontend with
`npm run dev:frontend`; `npm run e2e` reuses those servers.

---

# Shot 2 — Arena & Film Room redesign (Claude design branch)

> This section is the live handoff for the redesign. The engineering handoff below it is the
> original Codex closeout and stays authoritative for the engine, sources and contracts.

- **Branch:** `claude/nba-explorer-design`. The engineering baseline is `b4e5f88`.
  - The original history is preserved; never rebase, reset or rewrite it.
  - Never commit to or merge into `main`. Nothing has been deployed.
- **Approved direction:** A, Arena & Film Room. B and C were rejected visually. C's linked
  charts, brushing and filtering are reused in A's language only.
- **Evidence:**
  - `docs/redesign/VERIFICATION_LOG.md` holds per-stage results, test re-expressions and the
    bundle record.
  - `e2e/` holds the Playwright smoke and axe suites. Run them with `npm run e2e`, which needs
    `npm run dev` with ports 5173 and 3001 free.

## Stage status

| Stage | Scope                                                                        | Status |
| ----- | ---------------------------------------------------------------------------- | ------ |
| 0     | Baseline, harness, dependencies                                              | Done   |
| 1     | Tokens, fonts, motion system, primitives, chart kit                          | Done   |
| 2     | Global shell: masthead, nav, search, footer, Film Room frame, 404            | Done   |
| 3     | Player hub (overview, form, games, career, shooting), Recharts removal       | Done   |
| 4     | Shot Studio (court, dots/density/zones, linked table, export by stable ref)  | Done   |
| 5–8   | Compare suite; teams/games/standings/leaders; seasons/history; labs          | Done   |
| 9     | Homepage, landings, My NBA motion setting, "What's on tape" coverage page    | Done   |
| 10    | Route sweep, keyboard walkthrough, transform-only audit, copy, bundle record | Done   |

The redesign scope is implemented and verified across all 39 route examples (35 route
templates plus home, landings and the catch-all).

Final verified state:

- `npm run validate` exits 0: 347 frontend and 413 backend tests pass, lint has 0 errors, and
  typecheck and builds pass.
- Playwright passes 118/118. Smoke passes 78/78 on desktop and phone. Axe passes 40/40
  scans (39 routes plus the homepage loading state) with zero serious or critical
  violations.
- Initial JS is 196.5 kB gzip, against 235.2 kB at baseline.

## Continuation instructions

1. Check out `claude/nba-explorer-design` with a clean `git status`.
   - Run `npm ci` if `node_modules` is missing.
   - `npm run validate` must pass before and after any change.
2. The building blocks live in `frontend/src/{design,motion,ui,charts}`.
   - Research pages render inside `ResearchShell`, which provides the `.fr` Film Room scope.
   - Arena moments use `KineticHeadline`, `Reveal` and `Stagger`.
   - Chart marks animate from `useSeen()`, which reports true at once when motion is off.
3. Keep accessible names and copy that tests pin; see the test re-expressions in the
   verification log.
   - Re-express colour or geometry assertions as `data-*` hooks rather than deleting them.
   - Never add URL params outside the backend contracts.
4. Module names must not differ only by case. `court.ts` (geometry) and
   `BasketballCourt.tsx` (component) once shared the stem `Court`/`court`, and that blanked
   the app on Windows. `npm run check:module-case`, part of `validate`, fails on any such
   collision and on any import that resolves differently on a case-insensitive filesystem.
5. Run Prettier from the repository root (`npx prettier --write <paths>`). Run from a
   workspace folder, it misses `.prettierignore` and reformats the immutable
   `lineup-study-snapshot.json`.
6. Animate only `transform` and `opacity`, and never set React state per frame. Use motion
   values for scroll and pointer effects.
7. After each change, append its results to the verification log. Commit with the session
   trailers and push with `git push -u origin claude/nba-explorer-design`.

## Known limitations and open items

- **Initial focus.** Every page focuses its `h1` on entry, including the first load. This is
  an inherited contract pinned by baseline tests. The skip link and masthead are therefore
  reached with Shift+Tab from the heading.
- **Peak-season picker.** Its summary still reads "Choose a qualified peak season for NBA player
  {id}". A test pins the text verbatim, so it should be changed only together with that test.
- **Backend copy.** The run-together spacing defects are fixed. Beyond that, some engine copy
  stays dense ("regular finals", slash lists) and was left for its owners.
- **Demo-mode career data.** The fixture provider has no career raw totals, so career curves
  and career tables are empty in demo mode. This is a data limit; the page says so.
- **Search focus test.** The handoff of focus to the destination after a search choice is
  verified in Chromium only. jsdom skips the exit animation, so it cannot reproduce that
  ordering.
- **CSS size.** CSS grew from 8.8 kB to 23.7 kB gzip, the cost of the design system.
- **Lint warnings.** Lint reports 13 react-refresh warnings for modules that export constants
  alongside components. There are no errors.
- **Production checks.** Production-host reachability and deployment are not verified, and are
  not authorized on this branch.
- **Fixed: Windows startup failure.** The app was blank on Windows at `436cb60`, caused by
  `charts/Court.tsx` sitting beside `charts/court.ts`. It is fixed by renaming the
  component to `BasketballCourt` and is guarded by `check:module-case`. Details are in the
  verification log's hotfix entry.
- **Cold-start preview race.** Opening the homepage before the backend listens can leave the
  game preview saying its archive is unreachable until a reload. The page itself renders.
- The motion preference, item L10 in the Codex ledger, is now delivered on My NBA.

---

# NBA Performance Explorer 2.0 — Engineering Handoff

## Snapshot timestamp / branch / HEAD / base commit

Closeout completed on 2026-10-15 Australia/Sydney. Branch `codex/nba-explorer-2-engine`. Validated engine HEAD: `2561a17a2700b6f14fbed2cac727acfac1b09fdd`; the final documentation commit follows that checkpoint. Resolve the actual checkout HEAD with `git rev-parse HEAD`; the delivery report gives the final documentation SHA. Protected baseline: `cd557e4d3cf75e44f930ba75de4ea149a80ccdda`.

## Working tree and pending changes

All engineering changes are committed. Final documentation and audit evidence are the only changes being sealed by the closeout commit; no unfinished feature implementation remains. Confirm `git status --short` on receipt: the final delivery checks it after committing. Ignored local validation logs are not required for Cloud. No reset, discarded source work, stash, merge, push or deployment was performed.

## Goal and non-negotiable constraints

Shot 1 feature expansion is officially closed. This is the stable foundation for Claude Code Cloud Sessions to design and implement approved Shot 2 frontend work through GitHub. Do not resume old expansion instructions in the archived journal/master specification. Preserve source contracts, calculations, qualification, missingness, provider boundaries and attribution. No invented statistics, required paid services, restriction bypass or unapproved production action. Original visuals remain protected until the owner approves specific Shot 2 changes.

## Verified baseline and last validation results

`npm run validate` PASS after the final SVG repair: 737 tests, comprising 324 frontend tests in47files and413backend tests in41files; all formatting, lint, typechecks and production builds pass. Original434tests remain. No tests were removed or timeouts weakened. Frontend two-worker cap remains; the new team test preloads its subject before assertion timers to avoid cold module compilation affecting UI timing.

Genuine local evidence: `npm run smoke:engine` PASS16reads; `npm run smoke:closeout -- --write-report` PASS87reads (46contractAPIs,36SPArefreshes,5invalid/methodcases), realCSVcontent and exact source/dist asset hashes. Genuine shotSVG metadata/XML-reopen PASS. All35registered route templates plus home rendered in bounded browser checks. Reports are committed under `docs/expansion/CLOSEOUT_*`.

## Completed commits and shipped-on-branch vertical slices

All historical branch checkpoints remain intact. Last prior checkpoint5810907 delivered common-cohort profiles. Closeout commits:

- `121d4baf683e2286a9400bf0ae0d92a27db61853`: finished historical team rankings/splits, source-backed conference facts, source capability reporting, tests and bounded genuine acceptance harness.
- `2561a17a2700b6f14fbed2cac727acfac1b09fdd`: fixed invalid SVG duplicate namespace declarations and strengthened XML-reopen tests/evidence.
- Final documentation commit: this handoff, complete Claude inventory/setup, source notices, release notes, accurate134-item ledger and preserved archives. Its SHA is resolved from Git and reported at delivery.

Working modules include explorer; player rolling/split/raw/career/shooting research; selected/career/normalized comparisons; historical teams/results; playoff games/quarters; standings/leaders/recorded rankings; historical facts/awards/draft/records/calendar/progression; genuine shot maps/density/shooting tables; research lineup time/PM; discovery; local favorites/named links/preferences/recent history. Every route/control/source limit is listed in DESIGN_HANDOFF_FOR_CLAUDE.md; all public APIs in API_CATALOG.md.

## Current milestone and exact in-progress task

Engineering closeout is complete. There is no next feature implementation. Publish only the completed development branch **after explicit owner approval and watched-branch review**, then let Claude inspect the repository and propose supervised Shot 2 design. Production release is a later, separately authorized audit.

## Feature ledger summary (counts by status)

Exactly134requirements: **77VERIFIED,41PARTIAL,14BLOCKED,2DEFERRED**. All master IDs match one-for-one; machine-readablecounts in CLOSEOUT_FEATURE_COUNTS.json. Six earlier verified claims were reduced (A10,B10,B13,C08,F10,H11). Upcoming/current league capabilities A05/A08 are blocked. I06 historical franchise mapping is deferred because a permitted candidate exists but was not integrated; L10 motion preference is deferred. Verified means the complete behavior within its stated supported scope, not comprehensive/current/all-time NBA coverage.

SHOT_1_ENGINE_STATUS=WORKING_BUT_INCOMPLETE. READY_FOR_CLAUDE_DESIGN=YES for supervised work on the stable existing engine; this does not certify all module minimums or production readiness. D full match center and E current/full league remain incomplete; broader historical/lineup/era scopes remain limited.

## Data sources (verified, conditional, blocked, rejected)

- Existing NBA.com four endpoint families preserved; genuine local engine flows passed. Network availability, empty rows, broad source rights and actual Render/Cloud access remain conditional.
- Wikipedia CC BY-SA4.0: fixed2023-24league/team tables,2024playoff finals,2023draft; exact revisions/contributors/licence/adaptation notices. Wiki client uses33allowedtitles,10s/2MB/24hboundedcache/Retry-After, no retries.
- WikidataCC0: historical season/champion facts and exact article/NBA-ID enrichment; missing facts/modern franchise labels remain explicit, no fuzzy mapping.
- Genuine recorded2023-24archive:30sources,639regularrows/29scopedteams,18Chicago unknown-scope rows;1219agreedfinals/nineconflicts/twounpaired quarantines; common363GP20defaultcohort, not complete league.
- BoonP/KaggleCC0:13,470attempts/6143makes/203players/16teams/80games, partial2018playoffs. Original CSV/hash, geometry and licensing preserved.
- ArnaudOdet/DataverseEtalab2 author-derived2017-18research:13,867groups/1229games/540nativeBRIDs; one missing-period game/two exclusive groups quarantined. No rawPBP/code/pickle reuse, guessed NBA IDs or possession ratings.
- Broad NBA/CDN/ESPN/PBP routes remain rights/input blocked. MIT libraries do not license upstream datasets. No automatic fixture substitution, evasion, paid database or scheduler.

## Architecture and important decisions (with file pointers)

App.tsx registers additive lazy routes; original render trees/assets/provider remain unchanged. ResearchShell/research.module.css provide separate scoped UI. Shared Zod contracts in packages/contracts validate boundaries. Backend app/server compose independent optional providers; research services own raw math/source budget; recorded providers reuse immutable data and paired-game reconciliation. Frontend math helpers remain outside visual rendering. Local My NBA uses versioned internal URLs, strict caps, session recovery and separate opt-in recent key. Full architecture/styling/component inventory and data invariants are in the Claude handoff; operational details in OPERATIONS.md.

## Files changed in current work session

Interrupted team feature contracts/provider/router/UI/tests and source conference JSON; app capability plumbing/explorer text; SVG export helper/regression; opt-in smoke-closeout.ts/root script; final genuine/browser/export/count reports. Documentation: rootHANDOFF, README, architecture/state/decisions, all essential expansion audit/catalog/calculation/source/operations/design/release/verification documents. Original journal preserved in SHOT1_EXECUTION_JOURNAL.md and original specification in SHOT_1_MASTER_SPEC.md, explicitly marked archival/superseded.

## Tests and exact commands/results

- `npm run validate`: final PASS737, including final SVG namespace regression.
- `npm run smoke:engine`: PASS16genuine local reads and raw formula/rolling/comparison checks.
- `npm run smoke:closeout -- --write-report`: PASS87bounded genuine API/SPA/error/hash/CSVchecks after the production build.
- Focused team suites:4backend/3frontend cases PASS; source capability regression included in21-case suite PASS; shot UI/export suite5cases PASS.
- Literal Node ESM/jsdom genuine SVG check:261Curryfilteredattempts/hash/licence metadata and validXML PASS; no browser download wait.
- `git diff --check`: PASS.134uniqueledger IDs match archivedspec exactly; documentation links checked. Protected paths have no diff againstcd557e4.
- Local production config starts with NBA genuine provider, fixtures forbidden and builtSPA; actual host/remoteCI not tested or deployed.

## Known bugs, security concerns and reliability limitations

No confirmed unresolved critical calculation, route or export bug after closeout. Genuine checks found and repaired team frontend query mismatch and duplicateSVGxmlns. A few ad-hoc harness/selector/quoting mistakes were corrected without weakening application checks, and are recorded in VERIFICATION_LOG.md.

Release risks: production-host/Cloud egress, cold starts and memory remain unverified; local server working set128.7MB after genuine flows is not cloud certification. Original shared/Recharts646KBchunk warning remains. No public rate limiter or durable server cache added. Immutable integrity-checked asset corruption intentionally prevents startup. Historical cohorts are incomplete, not live/official; research lineups are reconstructed and lack possessions/on-off. Original masthead anchors/footer/metadata retain static live branding and need approved design integration. No same-fixture pixel equality test.

## Protected original UI baseline and visual check status

Original protected frontend files/assets/metadata/screenshots, originalbackendplayers andrender.yaml diff is empty againstcd557e4. Original tests remain. Actual original home/profile/compare and all expansion templates rendered at390x844; document375px/controlsfit/tablecontainersscroll. Default desktop width1280/document1265 tested for final team navigation. Viewport reset. ORIGINAL_VISUAL_DESIGN=unchanged_diff_only; no pixel-equality claim or redesigned baseline.

## Next task queue (ordered)

1. Owner confirms Render watchedbranch will not auto-deploy the developmentbranch, approves publication and executes the explicit safe branch commands in OPERATIONS.md.
2. Review GitHub CI, grant Claude Cloud repository/branch access; start a separate Shot2branch.
3. Claude reads this file and DESIGN_HANDOFF_FOR_CLAUDE.md, runs validation, inspects real supported pages and proposes designs for human approval.
4. Implement only approvedfrontendwork, preserving engine contracts/math/source/coverage and protected originals until specific approval.
5. Separately authorize future production release validation. Do not restart deferred source expansion during design.

## Single NEXT ACTION

Review `docs/expansion/DESIGN_HANDOFF_FOR_CLAUDE.md`, then approve development-branch publication only after confirming Render’s watchedbranch. No push command has been executed.

## Continuation prompt for a new Codex session

Shot1isclosed. Read currentGit,HANDOFF,FEATURE_LEDGER,Claudehandoff and source notices. Preserve the validated engine and all progress. Do not resume archived feature queues, redesign protected pages without approval, invent data, spend money, merge, push or deploy. ClaudeCloud owns supervisedShot2design/approvedfrontendimplementation on the published developmentfoundation; execute only the owner’s next explicit task.
