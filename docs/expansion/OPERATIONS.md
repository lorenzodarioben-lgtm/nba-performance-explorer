# Expansion operations

No new hosting/database/accounts are required. Keep render.yaml and production
NBA_ALLOW_FIXTURE_IN_PRODUCTION=false. No merge, remote push or deploy performed.
Process cache is ephemeral; Render cold starts refetch on demand, no scheduler.
Local preferences live in each browser/origin and are never sent to a cloud store.

## Local usage

```powershell
npm ci
npm run dev
```

Open http://localhost:5173/explore. Default fixture runtime is explicitly demo data;
raw totals/attempts unavailable. Genuine mode uses no API key:

```powershell
$env:NBA_DATA_PROVIDER='nba-stats'
npm run dev
```

If source errors, keep navigation working and show unavailable states. Do not switch
provider silently, copy fixtures into production, rotate proxies/IPs/cookies or bypass
blocking. No auto retry. Source cache disappears on process restart (500 legacy,
100 raw entries). Restart local server to invalidate cache for a justified debug test;
do not repeatedly invalidate merely to probe a failing source. Optional legacy
diagnostics are sanitized and disabled by default.

## Source acceptance

Opt-in only, never regular CI:

```powershell
npm run smoke:free-sources
npx tsx backend/src/scripts/probe-season-totals.ts
```

First has at most 12 checks, 5-second timeout, stop after two failures. Second only
two fixed Totals-mode requests. Do not rerun indiscriminately. Broad league/CDN/ESPN
feeds need usage-rights and host validation before enabling a new provider.

For the genuine engine acceptance suite, build and run a temporary local server:

```powershell
npm run build
$env:NBA_DATA_PROVIDER='nba-stats'
$env:FRONTEND_DIST='frontend/dist'
$env:PORT='3002'
node backend/dist/server.js
```

Then a second terminal: `npm run smoke:engine`. Fixed sixteen sequential API/SPA
reads; 25-second API timeout, no retries, localhost only; no raw response dumps.
Use a clean/current build. Reload browser tabs after replacing dist assets; old
in-memory lazy hashes may no longer exist and the existing error boundary offers
Reload. Do not infer a data outage from an obsolete asset hash. Review rollout/cache
handling before production release. Stop temporary services when QA finishes.

## Data / preference recovery

Missing profile: 404; missing season: nullable state; malformed/mismatched data: 502;
source unavailable/busy: 503; timeout: 504. Never a made-up zero career or live game.
Legacy timestamps unknown, raw response retrieval known, published as-of unknown.

Preference import merges, preserves existing values and rejects unsafe/oversized JSON.
Corrupt storage is left untouched on load. Export session JSON before closing if
storage is blocked/full. Clear requires UI confirmation, only affects the research key.
No server persistence, updates, telemetry, statistical export or accounts needed.

## Release gate

`npm run validate`, `git diff --check`, new bounded source acceptance in the actual
host if authorized, current browser desktop/phone/keyboard journeys, preserved legacy
visual checks. This branch is not production-ready merely because local sources pass.
Resolve source-rights gaps and finish outstanding minimums before full platform design
integration; keep stable supported tools reviewable for a targeted supervised pass.

## Career verification

Run `npx tsx backend/src/scripts/smoke-career.ts` only against a local genuine-provider server; bounded six requests and assertions, no raw traffic dumps or production calls. `probe-postseason-fields.ts` is opt-in, two existing-family reads, timeout 5 seconds, no retry. Do not enable fixtures in production.

## Raw-game and postseason checkpoint (2026-10-14)

Opt-in `npx tsx backend/src/scripts/smoke-game-research.ts` reads six local API/SPA paths; requires genuine provider, asserts weighted attempts, filters and separate playoffs. Temporary server requires restart after backend rebuild; reload browser after frontend hash changes. No automatic production/network fallback.

## CC0 history and qualification checkpoint (2026-10-14)

Wikidata history initializes lazily at server composition, with no key/cost. Fixed query and10s timeout;24h/one-entry cache,429 cooldown. Opt-in `smoke-history.ts` performs at most five local public API/SPA reads. Production-host access remains unverified. `probe-birthdate.ts` is two existing-family source reads,5s timeout/no retries. No deployment required.

## Usage-limit resume verification (2026-10-14)

Frontend maxWorkers2 bounds jsdom resource contention. Recent key nba-explorer.recent.v1 is separate from bookmark JSON. Clearing all stops recording and clears visits. Live age smoke performs3 local reads. New parser dependency parse5 is MIT/free and required in backend runtime for safe Wikimedia HTML table parsing; lockfile change is intentional, no original provider change.

## Wikipedia archive operation

Provider enabled independently at server composition; lazy reads, no key/cost. Fixed two page titles,24h/2-entry caches,10s/2 MB bounds, Retry-After cooldown, no retries or substitute endpoints. `npx tsx backend/src/scripts/smoke-wiki-archive.ts` performs at most10 localhost API/SPA reads; first uncached use loads only two public pages. Source revisions visible per response; host still untested. Runtime parse5 dependency/lockfile changes intentional. Regenerable `.impeccable/hook.cache.json` excluded; detector config preserves one synthetic-parser-fixture image false-positive suppression.
