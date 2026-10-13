# Calculation integrity

Observed regular-season games support rolling PTS/REB/AST/MIN averages, home/away,
W/L and opponent cohorts and observed season extrema. They do not support TS%,
eFG%, weighted shooting percentages, usage, pace, per-100, lineup ratings or
injury diagnosis. Empty cohorts mean unavailable, not zero.

Never derive career totals by multiplying rounded per-game season averages.
Never combine aggregate traded-player rows with their component team splits.
Formulas, examples and executed edge-case tests follow with implementation.
