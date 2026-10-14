# Shot 2 — Arena & Film Room redesign (Claude design branch)

> This section is the live handoff for the redesign. The engineering handoff below it is the
> original Codex closeout and stays authoritative for the engine, sources and contracts.

- **Branch:** `claude/nba-explorer-design` (engineering baseline `b4e5f88`; original history
  preserved — never rebase, reset or rewrite it; never commit to or merge into `main`).
- **Approved direction:** A — Arena & Film Room. B and C are rejected visually; C's linked
  charts / brushing / filtering may be reused in A's language only.
- **Evidence:** `docs/redesign/VERIFICATION_LOG.md` (per-stage results), `e2e/` (Playwright
  smoke + axe, `npm run e2e`, needs `npm run dev` ports free).

## Stage status

| Stage | Scope                                                                     | Status  |
| ----- | ------------------------------------------------------------------------- | ------- |
| 0     | Baseline, harness, dependencies                                           | Done    |
| 1     | Tokens, fonts, motion system, primitives, chart kit                       | Done    |
| 2     | Global shell: masthead, nav, search, footer, Film Room shell, 404         | Next    |
| 3     | Player hub (overview, form, games, career, shooting), Recharts removal    | Pending |
| 4     | Shot Studio (court, modes, linked table, export by stable ref)            | Pending |
| 5–8   | Compare suite; teams/games/standings/leaders; seasons/history; labs       | Pending |
| 9–10  | Homepage, landings, My NBA motion setting, final polish, axe zero serious | Pending |

## Continuation instructions

1. `git status` must be clean on `claude/nba-explorer-design`; `npm ci` if `node_modules` is
   missing; `npm run validate` must pass before and after each stage.
2. Continue with the first stage not marked Done above. Building blocks live in
   `frontend/src/{design,motion,ui,charts}`. Pages adopt the Film Room scope by wrapping
   research content in `.fr`; Arena moments use `KineticHeadline`, `Reveal`, `Stagger`.
3. Keep accessible names and copy that tests pin (see the test-compatibility notes in
   `docs/redesign/VERIFICATION_LOG.md`); re-express colour assertions as `data-*` hooks rather
   than deleting them. Never add URL params outside the backend contracts.
4. After each stage: append results to the verification log, update the table above, commit
   with the session trailers and `git push -u origin claude/nba-explorer-design`.

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
