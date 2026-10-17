# NBA 3.3 production startup incident

18 October 2026, Australia/Sydney. Release acceptance failed; the previous application is restored.

## Release and recovery

PR #29 was explicitly approved, marked ready and squash-merged as exactly one new main commit,
`cddbc102648fe33078673c6e9efec9ce8e388242`, titled
`feat: release NBA Performance Explorer 3.3`. Its parent is `cd557e4` and its complete tree
matches approved head `cf38acd`. Main CI passed. Original development history is preserved.

Render automatically built deployment `dep-db9nbh67bikc73dta55g` and reported it live at
00:20:48 Sydney. Subsequent production checks failed: health/API requests returned 503,
and the attempted exhaustive asset sweep subsequently received 429 responses. Those asset
responses do not establish missing or altered asset files. The sweep and browser runner
were stopped; no failed verification was represented as a pass.

Render reported health-check timeouts and restarted the HTTP process at approximately
00:22, 00:24 and 00:27. The browser initially rendered the application shell with unavailable
data and missing images. The owner subsequently reported that ordinary browser images and
search loaded; this does not override the recorded repeated health failures.

Restoring retained deployment `dep-d94imfp9rddc73aodnt0` failed in Render. The documented
fallback rebuilt its exact source `cd557e4d3cf75e44f930ba75de4ea149a80ccdda` as
`dep-db9nhgjbc2fs73cibglg`, live at 00:32:56. Health and genuine NBA.com player search returned
HTTP 200 after recovery. Render automatically disabled auto-deployment for the specific-commit
recovery. Keep it disabled until the corrected release is ready; do not redeploy the failing
main tree automatically. No paid upgrade, fixture substitution, Git revert or history rewrite
was performed. The original single release commit remains on main.

## Diagnosis and verified recovery candidate

The server starts two expensive scans after opening its HTTP listener. These read all 43
seasons and derive honours and single-game records. Yielding only between seasons leaves
large synchronous stretches on the HTTP event loop. Render Free supplies 512 MB and 0.15 CPU,
and its reported HTTP health deadline was five seconds.

Local diagnostics of the original calculations measured honours at 416 MB RSS and records
at 523 MB RSS, with a maximum event-loop block of 1,538 ms on the local machine. These are
local diagnostic measurements, not a certified Render CPU benchmark. Individual summary
and season-game loads measured 328 ms and 125 ms respectively; the eager global scans are
the targeted startup work.

The recovery candidate moves those existing global calculations into the build process.
The unchanged calculators produce 43 champions and all 72 scope/kind/category/mode record
responses in a 549,170-byte artifact. The build verifies every serialized response against
the original result. At startup the server verifies the artifact digest, source/algorithm
fingerprint, complete query coverage and existing response contracts. Requests refresh only
`servedAt`, preserving source dates, definitions, qualification rules, records and coverage.
Production requires the built artifact and does not repeat the scans on the serving thread.

The frontend, approved design, photographs, navigation, physics, datasets, source contracts
and original calculation algorithms are unchanged. Existing request validation and assertions
remain intact. A separate backend recovery branch preserves the approved release snapshot.

## Verification record

- Five focused cache/routing tests passed, including prevention of runtime scans, byte-integrity
  rejection, stale-input rejection, complete query coverage and existing input validation.
- Backend build and parity checks passed for all 72 real queries and the honours result.
- Full `npm run validate` passed: 541 frontend tests, 537 backend tests, formatting,
  lint (zero errors, 13 existing warnings), types, module-case and visual-asset checks,
  and both production builds.
- A cold local production process, with genuine providers selected and fixtures disabled,
  served eight record variants and honours successfully. During 35 seconds, all 69 concurrent
  health probes returned 200, with a maximum latency of 5 ms. Post-readiness RSS peaked at
  183 MB and maximum sampled event-loop delay was 25 ms. This is local regression evidence,
  not a Render resource or stability certification.
- The existing production smoke assertions passed 15/15 against the recovery build. Live
  player search/profile/seasons/logs, scoreboard, historical navigation/standings, SPA refresh,
  built assets, desktop/mobile images and keyboard search passed with no browser errors.
  The separate controlled upstream outage remained a labelled 503 without fixture fallback.
  Only the evidence output path and module import base were adapted for the separate run;
  application code and assertions in the original smoke script were unchanged.
- [Recovery validation evidence](evidence/RECOVERY_33_VALIDATION.json) records these results.
- The candidate is on a separate review branch. Main still contains exactly the one approved
  release commit. An additional corrective merge needs the owner's explicit exception to
  that single-commit requirement; do not rewrite the approved release commit.
- Production 3.3 acceptance remains incomplete; deployment status alone is insufficient.
- Rights remain unverified; the owner's explicit informed risk acceptance remains documented.
