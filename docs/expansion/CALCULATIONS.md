# Calculation integrity

Observed regular-season games support rolling PTS/REB/AST/MIN averages, home/away,
W/L and opponent cohorts and observed season extrema. They do not support TS%,
eFG%, weighted shooting percentages, usage, pace, per-100, lineup ratings or
injury diagnosis. Empty cohorts mean unavailable, not zero.

Never derive career totals by multiplying rounded per-game season averages.
Never combine aggregate traded-player rows with their component team splits.
Formulas, examples and executed edge-case tests follow with implementation.

Implemented in `backend/src/features/research/stats-core.ts`:

- Cohort average = recorded metric sum / observed matching games. Empty: null.
  Recorded zero remains zero. UI rounds to one decimal only at display.
- Rolling window = trailing N matching games chronologically, including the row's
  game, with actual sample count. Latest window ignores display sort.
- Win ratio = observed W / observed games. Empty: null. Example 3 in 4 = 0.75.
- Hand case PTS 10,20,30,30: average 22.5; two-game rolling 10,15,25,30 with
  samples 1,2,2,2; both 30-point games retained as tied highs.
- Inclusive literal league calendar date bounds, opponent/home-away/W-L filters
  precede calculation. Pagination/sort never alter cohort denominators.
- Duplicate IDs and conflicting same-date records are rejected. Bound: 150
  observed games and 50 ledger rows/page. No deduplication guesses.
- Comparison uses sourced regular-season summaries, one season per distinct NBA
  ID. Ratios ×100 for display; no era/pace/career-total estimates.

Hand calculations and edge cases passed in stats-core tests. Route/UI tests cover
empty seasons, timeouts, partial samples and malformed/repeated URL filters.
