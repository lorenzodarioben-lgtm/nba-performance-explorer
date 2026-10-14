# Operations and Claude Cloud setup

Shot 1 expansion is closed. This branch is a locally validated foundation for supervised design, not a production rollout. No push, merge or deployment was performed. Mandatory new data/API/storage cost is $0; no key, billing account, database, Redis, scheduler or durable writable disk is required.

## Development and preview

Use Node 22.12–22.x, npm and the committed lockfile. From the repository root:

```sh
npm ci
npm run validate
npm run dev
```

Frontend port 5173 proxies `/api` to backend port 3001. Development defaults to an explicitly labelled fixture player provider. Genuine immutable recorded archives remain independent. On Linux use `NBA_DATA_PROVIDER=nba-stats npm run dev`; PowerShell uses `$env:NBA_DATA_PROVIDER='nba-stats'` followed by `npm run dev`. Do not substitute fixtures when a genuine query fails. Original static live branding is preserved; research pages show their actual sources.

Preview the production build locally without deploying:

```sh
npm run build
NBA_DATA_PROVIDER=nba-stats NBA_ALLOW_FIXTURE_IN_PRODUCTION=false NODE_ENV=production FRONTEND_DIST=frontend/dist PORT=3002 node backend/dist/server.js
```

In PowerShell, set those five variables individually before running Node. `FRONTEND_DIST` resolves relative to the working directory and must contain the built `index.html`. Production config rejects a missing provider or accidental fixtures. `/api/health` checks the process, not every upstream. Vite preview alone does not prove backend integration.

Claude Cloud needs access to the owner-published development branch, Node/npm installation and repository files. Start with `HANDOFF.md` and `DESIGN_HANDOFF_FOR_CLAUDE.md`. Cloud/Render egress, memory and cold starts were not tested through deployment. If NBA/Wikimedia access fails, use unaffected genuine recorded tools and honest unavailable states. Never bypass access restrictions to make previews work.

## Verification

```sh
npm run validate
git diff --check
npm run smoke:engine
npm run smoke:closeout -- --write-report
```

Smoke commands require an already running local genuine server. They are opt-in, never ordinary CI or startup. Closeout allows only localhost HTTP, at most 100 sequential reads, 30-second API/5-second SPA timeouts, a ten-minute total budget and no retries. `CLOSEOUT_ACCEPTANCE.json` stores actual results. Avoid repeated probes of a failing source.

Frontend Vitest retains a two-worker cap for jsdom contention; no assertion or timeout was weakened. Existing 434 tests remain in the enlarged suite. New recorded data has genuine integrity/arithmetic tests, and controlled MSW/Supertest source/error tests remain deterministic. CI is configured on Ubuntu/Node 22 with `npm ci` and `npm run validate`; no remote CI was triggered during closeout.

Use bounded browser navigation/locator checks and API/export serialization assertions. Avoid download event/path waits: an earlier wait stalled for hours. When rebuilding assets, reload old tabs because lazy chunk hashes may have disappeared. Distinguish obsolete assets from a data outage. Reset temporary viewports and stop agent-started QA servers afterward.

## Failure and cache recovery

The original PlayerProvider and four NBA endpoint families remain unchanged. Separate raw/bio/game adapters have bounded caches; raw successful results cache for six hours, empty results for five minutes. The shared source budget permits three top-level network research jobs; a fourth receives 503 rather than queues or fans out.

Wikimedia uses fixed titles/queries, 24-hour bounded caches, ten-second timeouts/body limits and Retry-After cooldown for 429/503, with no retries. A restart clears process caches; use it only for justified local debugging, never to evade cooldown or flood a failing source.

400 means invalid input; 404 a valid absent identity/game; 502 invalid upstream data; 503 disabled/unavailable/busy; 504 timeout. A genuine missing season can be a 200 response with status/null fields. `null` is unavailable, not zero. Optional draft/roster enrichment failure retains source facts and external links, never guessed NBA IDs. `servedAt` is not source publication `asOf`. Recorded archives are neither live nor outage fallbacks.

Broad NBA/CDN/ESPN/PBP integrations remain blocked by rights or missing inputs. MIT source code does not license upstream data. No rotating IPs, proxies, hidden cookies, CAPTCHA bypass or unlicensed raw PBP substitution. Read the source audit and three data notices before using any new source.

## Recorded assets and manual updates

- `recorded-snapshot.json`: genuine 2023–24 Wikipedia adaptations, 30 credits, 639 regular stat rows and 18 separately unknown-scope Chicago rows. Pair reconciliation quarantines nine conflicts and two unpaired IDs. Do not guess a conflict repair.
- `recorded-conferences.json`: explicit 2023–24 conference facts from revision 1347383197, separately credited. These do not establish historical franchise identity.
- `shot-events.csv`: exact original CC0 bytes/hash, 13,470 attempts from partial 2018 playoffs. Replace only after deliberate rights, metadata, schema and geometry review.
- `lineup-study-snapshot.json`: compact Etalab 2 author-derived 2017–18 research groups. One missing-period game and two exclusive groups are quarantined. No raw PBP, foreign archive code, pickle or media is imported/executed.

Backend build copies fixed shot CSV and compact lineup JSON after tsc, because tsc otherwise reformats JSON and breaks the hash. Preserve `.gitattributes`, `.prettierignore` and startup checks. Corrupt integrity-checked assets deliberately prevent startup rather than serve false data. Source/dist hashes and local production startup passed; host certification remains separate.

Manual tools, never automatic:

```sh
npx tsx backend/src/scripts/build-recorded-snapshot.ts --help
python backend/src/scripts/import-lineup-study.py --help
```

The recorded builder defaults to an audit of 30 fixed pages and at most 20 serial CC0 queries, without writes/retries. `--write` requires unchanged tracked data, a valid result and guarded fixed-workspace/exclusive pending output. The lineup importer validates checksums and designated author-derived CSV members, and refuses to overwrite dirty/untracked existing output. Review source scopes, licences and tests before committing an update. Do not expand source datasets as part of Shot 2 design.

## Browser preferences

Favorites/named URLs use version 1, maximum 100 entries and 100,000 serialized JSON characters. Import validates implemented internal paths, rejects unsafe/oversized/corrupt data and merges existing bookmarks. Corrupt storage is untouched on load; blocked/quota storage falls back to session data with a warning. Export that JSON before closing if persistence failed. Clear requires confirmation. Recent history uses a separate key, is off by default, stores at most 20 research URLs and excludes original screens. No accounts, cloud sync or server telemetry; preferences are per browser/origin and not part of GitHub delivery.

## Publish only after owner approval

First confirm the Render service does **not** watch this development branch: unchanged `render.yaml` has `autoDeploy: true`, and its actual watched branch was not inspected. Verify origin, branch, expected HEAD and clean tree. Publishing for Claude does not authorize merging/deploying.

```sh
git status --short --branch
git branch --show-current
git rev-parse HEAD
git remote get-url origin
git push --dry-run origin refs/heads/codex/nba-explorer-2-engine:refs/heads/codex/nba-explorer-2-engine
git push --set-upstream origin refs/heads/codex/nba-explorer-2-engine:refs/heads/codex/nba-explorer-2-engine
```

These are prepared commands; Codex executed neither push. They target only the development branch and use no force option. If remote history diverged, stop and inspect; do not reset, force, merge or rewrite automatically. A branch push triggers existing GitHub Actions CI and must not trigger production deployment. After CI passes, give Claude access to this branch and create a separate Shot 2 branch for approved frontend work.

## Release risks

No current league feed, full box/PBP, possession ratings, on/off, representative league zones, cross-era normalization or medical availability feed. The ledger distinguishes all missing behavior. Original static branding and home anchors need an approved design integration decision. The approximately 646 KB original shared/Recharts chunk warning remains. No public API rate limiter, authenticated storage or persistent cache was added. Render/Cloud network, cold starts, memory and matched pixel regression still require a separately authorized release audit. Design readiness is not deployment approval.
