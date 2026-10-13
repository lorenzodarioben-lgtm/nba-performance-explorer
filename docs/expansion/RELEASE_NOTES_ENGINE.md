# Shot 1 engineering release notes

NOT DEPLOYED / NOT MERGED. Branch codex/nba-explorer-2-engine, base cd557e4.

Shipped on this branch: seven new page patterns and seven GET API patterns. Explorer
hub; sourced 30-team identity directory; observed-game player analysis (rolling,
splits, date/opponent/results filters, sorting, pagination and extrema); independent
2–4 player season comparison; raw Totals-mode shooting efficiency and per36;
selected-cohort scatter/table and transparent weighted ranking; versioned local
favorites and research import/export with recovery. Every NBA number comes from
existing NBA provider data, or explicitly labeled deterministic test/demo mode.
No fabricated attempts, shots, scores, rankings or joint lineup performance.

Existing four NBA endpoint families passed 12 local bounded checks. Raw Totals
fields separately passed two checks. Genuine local API acceptance passed 16 checks:
74 Curry games, two BOS-filtered records, raw formulas, three real comparison and
raw-metric cohort slots, changing weight results, 30 identities and six SPA refreshes.
Live source access from Render is NOT verified, and rights remain conditional under
existing ADR-013. No broader ESPN/NBA league feeds or bulk archives enabled.

Baseline was 434 tests. Latest complete source gate before final identity hardening
passed 566; identity guards additionally passed focused research tests/typecheck.
Final `npm run validate` passed 247 frontend + 320 backend = 567; see VERIFICATION_LOG.md. Builds pass;
known Vite/Recharts chunk warning remains. No dependencies, costs, deployments,
production secrets, original visual files or screenshot baselines changed.

Plain UI intentionally awaits supervised Shot 2. Phone 390x844: no outer overflow,
three real scatter points matched table rows, keyboard table scroll worked. A stale
lazy chunk after rebuilding static assets recovered via the existing reload boundary;
production asset rollover belongs in Shot 3 testing.

Minimum slices: B/F/L pass in supported scope; H passes for explicit selected cohorts
only, with league distributions/percentiles absent. A daily games, C roster/schedule,
D match center, E standings/leaders, I league history, J observed/hypothetical roster,
K discover are not delivered. G shots honestly gated. Overall WORKING_BUT_INCOMPLETE.
Career milestones/peak-season selection and multi-player career trends remain
unstarted/deferred, not falsely called data-delivered. See feature ledger and handoff.

Final all-work gate PASS: 567 tests, all strict checks/builds; 28 scoped verified features, 7 partial, 83 data-blocked and 16 deferred. No full-platform completeness claimed.

## Resumed career checkpoint

Added reported career raw totals, weighted efficiency, chronological season timeline with gap labels, milestone thresholds, explicit min-games peak with ties, and 2–4 player career curves/table with shareable state. Missing players and transient source failures remain distinct slots. Qualified peak choices update only the chosen comparison season. 577-test full gate passed and six genuine local API/refresh checks passed for active and retired players. No push, merge, deployment or new mandatory costs. Implementation continues; this checkpoint is not the end of SHOT 1.

## Raw-game and postseason checkpoint (2026-10-14)

Added raw shooting and defensive game logs, attempt-weighted splits/rolling, explicit unusual-game thresholds and share state; separately scoped postseason careers/games and same-season regular/playoff comparison. Old player APIs and original website remain unchanged. Full591 tests and six genuine local smoke reads pass; responsive keyboard QA passes. Work continues beyond this checkpoint.

## CC0 history and qualification checkpoint (2026-10-14)

Added a working free CC0 historical season/champion navigator with filters, source links, missingness, record-backed navigation, bookmarks and direct routes. Adds bounded source caching and rate-limit cooldown. Game research now has explicit cohort minimum qualification. Full602 tests and five genuine local history checks pass. Continue age/team history, selected-cohort discovery and local preferences.

History inventory precision: I01 navigator is delivered; I05 year/decade filters, I08 championship facts and I11 fact-coverage views are partial. I02 statistical leaders, I03 statistical record book, I09 record progression and I10 era normalization are not delivered by the champion source. Those gates remain unavailable.

## Usage-limit resume verification (2026-10-14)

Verified sourced age/trade metadata and opt-in recent history; full614 gate passes with jsdom worker cap2. All original assertions and timeouts remain. Work continues into licensed Wikimedia standings/game snapshots and selected-pool discovery.

## Historical league/game source

Licensed Wikipedia snapshots add historical standings, published leaders, date/team playoff scoreboard, actual source-ID game details, validated quarter/overtime scoring and optional team historical results. Regular standings and recorded playoffs remain separate. User-facing credit/licence/modification notices included. No original website redesign, NBA provider change, mandatory cost or deployment. Current feeds, full box scores and rosters remain incomplete.

Selected-season discovery adds transparent standardized distance, ties, source evidence, random qualifying target and saved/shareable filters. Existing NBA endpoint families only; no paid service or league-wide cohort claim.

Historical team source adds source-listed rosters,82 reconciled regular results per team, participant summaries/raw totals where explicit, and exact Wiki/Wikidata ID evidence. Thirty fixed source pages verified without costs or NBA endpoint expansion. Unknown scope and missing IDs remain unavailable rather than guessed.

Raw shooting-type page adds attempt qualification, weighted percentages, attempt/point shares and made-shot score reconciliation. Regular/playoff scopes separate, actual counts only. No coordinates, fake heatmaps or mandatory cost.
