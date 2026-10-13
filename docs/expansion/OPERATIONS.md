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
