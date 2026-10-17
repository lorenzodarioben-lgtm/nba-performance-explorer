# NBA 3.3 final publication preparation

18 October 2026 (Sydney; verification began 17 October). **Not released; final merge/deployment approval remains pending.** The
owner explicitly accepts the documented rights risks without claiming licences or permissions
and authorizes preparation, commit/push and existing-PR updates. Application implementation
and approved design are unchanged.

## Reviewable materials

The README now leads with the approved homepage and includes genuine archive, profile,
statistics, team, comparison, liquid VS, scoreboard, game, Shot Studio, Workbench and mobile
captures. Screenshots are native browser captures; source labels and data coverage remain
visible or explicitly captioned. Every gallery capture uses production configuration with
fixtures disabled, including the fresh 390-pixel homepage and keyboard-selected player search.
Queried NBA.com results and recorded historical datasets retain their source distinctions.

Capture source, dimensions, hashes and source classification are recorded in
[the manifest](screenshots/3.3/capture-manifest.json). Historical screenshot files remain
preserved. No application stylesheet, component, photograph, source dataset or test assertion
was changed for presentation.

## Current completion checklist

| Requirement                                | Status                                                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Final README and screenshot gallery        | Verified: 13 native captures, hashes/metadata; GitHub-rendered paths/images and layout passed                                      |
| `npm run validate`                         | Passed: 541 frontend / 532 backend tests, formatting/lint/types/assets and production builds; 13 existing lint warnings            |
| Separate visual asset check                | Passed: 401 files, 73 players, 45 marks, 1,257 archive/franchise team-seasons                                                      |
| Desktop/mobile browser suite               | Passed in one run: 242 passed, 78 intentional skips, 0 failures, 9.4 minutes; assertions unchanged                                 |
| Production acceptance, fixtures disabled   | Passed 15/15; fresh desktop/mobile captures, real providers and separately simulated outage                                        |
| Current live NBA parser gate               | Passed 4/4 using current production parsers; 10000ms timeout, no retries                                                           |
| Dependency/security review                 | Passed: zero vulnerabilities; 725 release texts / 95 client bundle files without tested credential patterns; no public source maps |
| GitHub CI                                  | Local validation passed; exact final-head push/PR CI run links are recorded in PR #29 after this preparation commit                |
| Rights cleared                             | **No**: owner explicitly accepts documented photo/headshot, mark and NBA.com reuse risks; no licences claimed                      |
| PR #29 squash-merged                       | **No**: remains draft, auto-merge off; final explicit approval required                                                            |
| Exactly one new 3.3 release commit on main | **No release commit yet**; eventual approved squash must add exactly one                                                           |
| Render deployed 3.3                        | **No**: existing main `cd557e4` remains live                                                                                       |
| Live website accepted as 3.3               | **Not executed**; requires authorized merge/deploy and actual new deploy SHA/ID                                                    |

Fresh full results: [publication validation](evidence/PUBLICATION_33_VALIDATION.json) and
[publication security review](evidence/PUBLICATION_33_SECURITY.json). Browser fixture/archive
checks remain distinct from actual production/live checks. No in-progress game was available
for live-update acceptance. Safari, Firefox and physical devices remain unverified.

## Actual Render findings

The owner supplied browser access. Read-only inspection confirmed service
`srv-d8shjfho3t8c73bck8kg`, free Node in Oregon, branch `main`, auto-deploy **On Commit**,
PR previews **Off**, root build `npm ci && npm run build`, start
`node backend/dist/server.js`, and health `/api/health`. The four environment values match
the approved Blueprint: live provider, fixtures false, 10000ms timeout and `frontend/dist`.
No settings were changed; no linked environment groups or `NODE_VERSION` override were shown.
Both main and the release select Node 22 in `.nvmrc`. The exact running patch is unavailable
because the successful deployment's logs are no longer retained and Shell requires a paid
plan. No upgrade or runtime command was performed.

The dashboard identifies live commit `cd557e4d3cf75e44f930ba75de4ea149a80ccdda`, deployment
`dep-d94imfp9rddc73aodnt0`, successful on 4 July 2026 at 15:48:15 UTC. Record this known-good
baseline before an approved merge, and recheck retained rollback availability at that time.

Five real HTTP checks through the existing public Render deployment passed: health,
player search, profile, 23 career seasons and 71 games in the 2023-24 log. This establishes
existing host connectivity; it does not claim that the unpublished 3.3 build is deployed.
See [sanitized configuration and host evidence](evidence/PUBLICATION_33_RENDER_CHECK.json).

## Remaining owner actions and final release gate

1. Preserve the limitations in [the rights review](RIGHTS_REVIEW_3.3.md). The owner has
   explicitly accepted these risks for this personal, non-commercial project. This is not
   rights-holder permission; do not request the same clearance again absent a new issue.
2. Finish technical validation, publish the preparation changes without rewriting history,
   update existing PR #29 and obtain green final-head CI, as now authorized. Preserve local
   private settings and raw assets.
3. Present the final README/screenshots, tests, Render configuration and remaining limits.
   Obtain the owner's **explicit final approval to squash-merge and deploy** before merging
   or triggering deployment. Earlier phase-5 preparation restrictions are superseded by
   the owner's later instruction; the final merge/deploy approval requirement is unchanged.
4. Use **Squash and merge only**, adding exactly one new main commit titled
   `feat: release NBA Performance Explorer 3.3`. Inspect the complete proposed body and
   co-author trailers; use the project-focused description in the release notes and omit
   preparation deploy-skip markers.
5. Monitor the automatic Render deployment, record its new SHA/ID, and accept the actual
   3.3 website across the requested routes, sources, mobile layouts and error states.
   Follow the rollback runbook if acceptance fails; never substitute production fixtures.

## Release attribution

The README, new captions, PR communications and proposed merge message contain no assistant
credits, badges or promotional signatures. Any new commit must use the existing configured
owner identity with no assistant co-author. Historical contributor records, tool-specific
branch references, data/image provenance and legitimate third-party credits remain intact.
See the [historical metadata audit](ATTRIBUTION_REVIEW_3.3.md).
