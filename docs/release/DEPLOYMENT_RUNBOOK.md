# Deployment runbook - NBA Performance Explorer 3.3

**Future owner action only. This audit does not merge, deploy or change Render settings.**

**AUTO-DEPLOY WARNING:** `render.yaml` has `autoDeploy: true`. If the existing Render
service is still linked to `main`, an approved squash merge can automatically build and
publish 3.3. A draft PR does not change main. Confirm the actual dashboard branch, auto-deploy
mode and any preview-service settings before approval; dashboard state was not available to
this audit. Do not enable a PR preview deployment during release preparation.

The draft PR uses the `render-preview-skip` label to suppress automatic service previews.
It is initially opened with a temporary `[skip preview]` title marker, then labelled before
setting the exact requested release title. This avoids a preview before GitHub applies labels.
Keep the label until an owner-approved preview or release decision. The repository Blueprint
does not enable preview environments; any different dashboard-linked Blueprint still needs
owner confirmation. See [service previews](https://render.com/docs/service-previews) and
[Blueprint preview environments](https://render.com/docs/preview-environments).

The release-preparation commit also uses Render's deploy-skip marker to suppress deployment
from that push if a service's branch linkage differs from the reported configuration. Before
the future approved squash merge, replace GitHub's generated title/body with the exact release
title and suggested description, excluding deploy-skip markers from the release commit.

## 1. Release and publication decision

- Release source: `release/nba-performance-explorer-3.3`; approved application baseline
  `8e2b38b6b3c5569c2700cd041bcb9b6d0e3818ce`.
- The neutral branch is a single snapshot with main as its parent and an identical tree to
  the verified development tip. The original development branch and all its commits remain.
- Existing public service: https://nba-performance-explorer.onrender.com. Its health endpoint
  returned 200 on 17 October 2026; health does not expose or prove its deployed commit.
- Main at audit start: `cd557e4d3cf75e44f930ba75de4ea149a80ccdda`.
  Recheck main and the last good Render deploy immediately before any approved release.
- The latest GitHub deployment record inspected is dated 4 July 2026, ref
  `feature/production-deployment`, SHA `00cf13bc57611a8a57ffacc3075e2c30ad06fe2b`.
  This historical record does not establish the current dashboard linkage or deployed SHA.
- Read [release readiness](RELEASE_READINESS.md) and [rights review](RIGHTS_REVIEW_3.3.md).
  Image reuse and NBA.com publication rights remain unresolved. Technical success does not
  clear public distribution. Keep the PR draft until the owner resolves the listed approvals.

## 2. Verified repository settings versus dashboard checks

| Setting       | Repository evidence / required dashboard check                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| Runtime       | Node `>=22.12.0 <23`; local validation uses 22.19.0; CI uses Node 22                                    |
| Install/build | `npm ci && npm run build` from repository root, including build-time dev dependencies                   |
| Start         | `node backend/dist/server.js`                                                                           |
| Port          | Render supplies `PORT`; server listens on it, defaulting locally to 3001                                |
| Health        | `/api/health`; liveness only, not a guarantee of upstream NBA.com availability                          |
| Frontend      | `FRONTEND_DIST=frontend/dist`; built SPA/assets served by the backend from one origin                   |
| Live provider | `NBA_DATA_PROVIDER=nba-stats`                                                                           |
| Fixture guard | `NBA_ALLOW_FIXTURE_IN_PRODUCTION=false`; absent production provider fails startup                       |
| Stats timeout | `NBA_STATS_TIMEOUT_MS=10000`; valid range 1000-30000ms; zero retries                                    |
| Diagnostics   | `NBA_STATS_DIAGNOSTICS=false` or unset; sanitized diagnostics are opt-in                                |
| Wikipedia     | `WIKI_ARCHIVE_MODE` unset means `live`, with labelled committed fallback; `bundled` is optional         |
| Browser API   | `VITE_API_BASE_URL` unset/empty for same-origin hosting; only a public API origin belongs here          |
| Deployment    | Blueprint says free Node service, Oregon, automatic deployment; actual settings need owner confirmation |

No new secret is required. Do not copy server credentials into `VITE_*` variables. Confirm a
higher-priority Render `NODE_VERSION`, `.node-version` or `.nvmrc` is not overriding engines
with an incompatible major. Use a currently patched compatible Node 22 release. Keep build
installation from omitting TypeScript/Vite development dependencies. Render's default
`NODE_ENV=production` applies at runtime; a custom build-time override can change npm omission.
See [Node selection](https://render.com/docs/node-version) and
[Render environment defaults](https://render.com/docs/environment-variables).

The approved blueprint is unchanged. Its historical connectivity comments are not today's
connectivity proof, and its optional explicit fixture-mode rollback is not the release plan.
Do not substitute fixtures to claim live availability. If live data fails, retain honest
unavailable states or roll back to the previous approved production commit.

## 3. Local production acceptance before approval

Run these sequentially to avoid timing failures from competing suites:

```powershell
npm run validate
npm run check:visual-assets
npm run e2e
npm run connectivity-gate --workspace backend
node scripts/smoke-release.mjs
```

Set `PW_CHROMIUM_PATH` to an installed Chromium executable when required by the local
Playwright installation. The release smoke starts its own local server on 4393, refuses an
occupied HTTP port, uses the built frontend/backend with production mode and live providers,
checks real API contracts and SPA refresh, then injects a controlled upstream outage. It
closes only its own processes. Existing development servers remain running. The outage is
simulated and is labelled separately from genuine live-source results.

Evidence: `docs/release/evidence/RELEASE_33_SMOKE.json` and production desktop/mobile captures.
Live success from a laptop does not establish reachability from Render. The four-endpoint
connectivity gate uses current application parsers, one request per endpoint and no retries.
The broad historical `smoke:closeout` script was inspected but is unnecessary for this bounded
check because it would repeat many upstream requests and has older coverage assumptions.

## 4. Merge strategy - owner only

**MERGE METHOD: SQUASH AND MERGE ONLY. This entire release must enter main as one new commit.**

1. Resolve rights/publication review, confirm dashboard settings and approve the release window.
2. Check the latest draft PR head and green CI; review the production smoke and current Render
   connectivity. Keep the approved development history intact.
3. When ready, the owner marks the PR ready and selects GitHub **Squash and merge**.
4. Set the squash title to `feat: release NBA Performance Explorer 3.3` and use the description
   in [release notes](RELEASE_NOTES_3.3.md). Inspect the generated body for unwanted co-author
   trailers and remove deploy-skip markers. Do not choose ordinary merge or rebase-and-merge.
5. Preserve the source branch. With unchanged main and a squash merge, main gains exactly one
   release commit. The many feature commits stay on the development branch.

GitHub currently allows squash, ordinary merge and rebase. Squash-only is an explicit owner
workflow requirement, not a repository setting enforced by this audit. No repository merge
settings or auto-merge settings were changed. See [GitHub merge methods](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/about-merge-methods-on-github).

## 5. Deployment consequence and post-release acceptance

With the reported main linkage and `autoDeploy: true`, the approved merge can trigger Render
without a separate deploy command. Confirm the intended On Commit/After CI mode beforehand.
Only the owner may approve a dashboard or live configuration change. No deploy hooks, manual
builds, dashboard changes or deployment APIs are used by this preparation task.
See [Render deploy behavior](https://render.com/docs/deploys).

After the approved deployment, record the actual squash SHA and Render deploy ID. Verify:

- `/api/health` and source status, plus the four live Stats parser checks from the Render host.
- `/`, direct refresh of `/players/2544`, `/teams`, `/compare`, `/history`, `/games`, and `/my-nba`.
- Player/global search, profile/career/logs, scoreboard and labelled historical navigation.
- Images/assets, keyboard flow, reduced motion, mobile layout and browser console.
- `NBA_DATA_PROVIDER=nba-stats`, fixtures disabled, and genuine unavailable messages on failure.

Render Free sleeps after 15 idle minutes and can take about one minute to wake. Its filesystem
is ephemeral; memory caches reset on restart. The committed archives are build artifacts,
not writable persistence. Saved research remains in browser storage. No Render load/memory
certification is claimed. Free-tier usage and rollback availability have limits; review the
[current Free documentation](https://render.com/docs/free) before scheduling release.

## 6. Rollback plan - owner only

1. Record the last good deployed commit/deploy ID before merging; main's audit-start SHA is a
   reference, not proof that the same SHA is currently deployed.
2. If deployment fails, select the last good deploy in Render when retained/available. Review
   auto-deploy behavior so a later push does not reintroduce the broken release.
3. For a durable Git rollback, revert the one squash release commit through a reviewed GitHub
   change. That adds a revert commit and, under auto-deploy, republishes the prior code.
4. Retain the development branch and diagnostic evidence. Do not reset or force-push main.
5. Recheck health, live source reachability, representative routes and data labels after rollback.

Free services retain only limited rollback history. If the desired deploy is unavailable,
rebuild the recorded last good commit through an owner-approved deployment action. No rollback
or provider switch is executed during this audit.
