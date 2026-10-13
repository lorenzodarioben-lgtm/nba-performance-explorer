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
