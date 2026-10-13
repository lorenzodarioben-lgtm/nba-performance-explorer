# Calculation integrity

Authoritative formula references: Shot 1 brief section 5.4. Implementation:
`backend/src/features/research/{stats-core,efficiency,cohort-core}.ts`. Pure functions
are separate from rendering. Values remain unrounded internally except the explicit
custom-score tie convention below. Never multiply rounded per-game means into totals.

| Calculation         | Inputs / formula                                                               | Empty / qualification                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Observed average    | Recorded PTS/REB/AST/MIN sum / matching observed games                         | Empty null; recorded zero remains zero; actual sample always visible. Legacy game minutes are recorded integers, not second-accurate durations. |
| Rolling form        | Chronological trailing N matching games, including the row game                | N 1–20; fewer games use their actual sample. Latest window is independent of display sort.                                                      |
| Splits / win ratio  | Home/away, W/L, opponent and inclusive date cohorts; observed wins / sample    | Observed logs only, not complete team schedules; empty null. No injury inference. No game shooting percentages without game attempts.           |
| Extrema             | Min/max recorded metric in the full filtered cohort; retain every tied game ID | Not an all-career or official NBA record; coverage explicit.                                                                                    |
| FG / 3P / FT ratio  | Aggregated makes / corresponding attempts                                      | Missing input or zero attempts null; never mean of game percentages.                                                                            |
| eFG                 | (FGM + 0.5 × 3PM) / FGA                                                        | Requires raw counts; zero/missing denominator null. May legitimately exceed 1.                                                                  |
| TS estimate         | PTS / [2 × (FGA + 0.44 × FTA)]                                                 | Conventional estimated FT possession weight, not actual possessions; missing/zero denominator null. May exceed 1.                               |
| AST/TO              | Raw assists / turnovers                                                        | Zero turnovers null, not infinity.                                                                                                              |
| Points per 36       | 36 × raw PTS / recorded raw MIN                                                | Zero/missing MIN null; no rounded per-game extrapolation.                                                                                       |
| Cohort z-score      | (value - mean) / population SD, where SD = sqrt(sum squared deviations / N)    | Same selected eligible cohort on both axes; constant metric z = 0; no league percentile or era adjustment.                                      |
| Custom score        | weightX × z(X) + weightY × z(Y), weights -5..5                                 | Scores round to six decimals; descending numeric order; exact rounded ties competition ranks 1,1,3, stable NBA ID order.                        |
| Pearson correlation | sum((x-meanX)(y-meanY)) / (N × SDx × SDy)                                      | At least 3 eligible values, nonzero variance both axes; otherwise null. Descriptive, not causal; tiny selected sample disclosed.                |

Date/opponent/location/result filters precede all observed-game calculations.
Pagination (max 50 rows) and sorting affect the ledger only, not denominators.
Duplicate IDs/same-date conflicting public game records are rejected, not guessed
or silently counted twice. Bound: 150 game records / season. Source game dates stay
literal league calendar dates with no viewer-timezone shifting.

Raw Totals mapping validates player, league 00, season, numeric/count fields,
made <= attempted and 3PM <= FGM / 3PA <= FGA. Nullable fields stay null. Traded
seasons select the unique TOT/zero-team aggregate exactly once; duplicate or
ambiguous rows fail. Non-NBA rows excluded. No historical fields invented.

Cohort qualification defaults to at least 10 played games; it is a custom rule,
not an official NBA eligibility threshold. Selected cohorts contain only 2–4
requested player-seasons. Missing values excluded from BOTH axes. Raw metrics
require matching player/season and equal games-played counts between total and
summary sources; conflicts are excluded. Percentage axes are input ratios (0.5
means 50%); exact-value table preserves full inputs. Shooting ratios in this lab
use raw denominators so a zero-attempt legacy percentage is not ranked as a zero.

Hand checks executed in unit tests:

- PTS 10,20,30,30 => mean 22.5, 3 wins in 4 => 0.75. Two-game rolling
  10,15,25,30 with actual samples 1,2,2,2; both 30-point highs retained.
- Raw PTS 100, FGM 35, FGA 70, 3PM 10, FTA/FTM 20, MIN 180, AST 30, TO 10:
  TS = 100/157.6, eFG = 40/70, FG = 0.5, AST/TO = 3, points/36 = 20.
- One made three / one FGA, PTS 3, no FTA: TS/eFG = 1.5 (not clamped).
- Cohort X 10,20,30 and Y 1,2,3: SDx sqrt(200/3), highest z sqrt(1.5),
  equal-weight score 2.449490, Pearson 1; negative weight reverses rank.
  Constant Y returns z=0/correlation null; tied scores retain 1,1,3.

Real local acceptance independently reconciled Curry's latest 10 of 74 2023-24
logs with the insight average; BOS filter matched two actual records; sourced
raw TS/eFG formulas matched exact inputs; three real player-seasons qualified
for TS/AST-TO, and reversing weights changed the ranking. See verification log.

Unsupported: league percentiles/distributions, possessions/pace/per-100, usage,
lineup/on-off/ratings, career milestone totals and official records, playoff mode,
weighted game shooting splits and era adjustment. Some are feasible follow-ups
within existing endpoints; others need rights-cleared league/lineup datasets.
