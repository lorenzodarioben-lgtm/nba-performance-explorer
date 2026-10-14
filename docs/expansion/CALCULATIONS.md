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

## Reported career, milestones and peak

One representative raw row per season; a traded season uses its unique aggregate exactly once. Counts sum only if every reported row has that field; any missing field makes that aggregate unavailable. Career percentages use summed raw attempts, never a mean of per-season percentages. Career per-game values use raw counts / GP, with zero GP unavailable. Peak is max selected metric among reported seasons with GP >= explicit minimum (default 20); missing denominators excluded, all exact ties retained, chronological ordering. No official or era-adjusted peak claim.

Milestones use chronological raw PTS/REB/AST cumulative counts and fixed visible thresholds. A crossing means reached within reported rows by that reported season, not actual first-ever career crossing or a game date. Null inputs propagate unknown cumulative coverage. Curves break across absent calendar years, null values or low-GP rows. The accessible table retains excluded rows rather than plotting zero.

## Raw-game and postseason checkpoint (2026-10-14)

Raw-game shooting ratios use total makes/attempts across the filtered cohort. TS% uses summed PTS / (2 × (FGA + 0.44 × FTA)); eFG uses (FGM + .5 × 3PM) / FGA. Missing fields propagate null; zero denominator unavailable. STL/BLK/TOV averages use actual game sample, not season GP. Filters including thresholds apply before trailing windows/splits/extrema; pages never affect cohort math. Exact ties retain all date/opponent/ID evidence. Regular and playoffs have separate cache keys/result sets/season codes and cannot mix.

## CC0 history and qualification checkpoint (2026-10-14)

History is a narrow source-fact projection, not an official NBA archive. Season labels must match NBA-season shape and contiguous ending year; century rollover1999–2000 becomes1999-00. Summer League/noncanonical labels excluded and counted. Source entities remain namespaced `wd:`; current labels never imply historical alias or NBA team mapping. Explicit multiple winner statements are retained; duplicates/ambiguous season mappings rejected. Navigation comes from existing filtered records. No calculated official franchise totals. Game cohort minSample suppresses derived averages/efficiency before plotting/display, while preserving raw totals/evidence.

## Age, team stints and opt-in history checkpoint (2026-10-14)

Age = seasonStartYear - birthYear - 1 when birthday is after October1; sourced calendar DOB only, no draft proxy. Missing/inconsistent age input yields unavailable. Career team split rows are metadata, while the unique aggregate contributes once to totals. Abbreviation changes and missing seasons remain explicit; no transfer-date inference. Age curves break on missing age/year inputs.

## Historical tables and recorded team scoring (2026-10-14)

Standing GP must equal W+L. Win ratio = W/GP, reconciled to source percentage within0.00051 rounding tolerance. Conference ranks and GB come from source cells; no tiebreak algorithm invented. Published leader values preserve units (FG72.5 means72.5%, not0.725); signed team+/− accepted, ties retained, source-defined efficiency not recomputed. Game final scores equal summed Q/OT scores; period order, team identities and recap game ID must agree. Team results/form/point averages use only filtered recorded playoff finals; home/away filters precede summaries, no regular/playoff mixing, zero games yields unavailable averages. UTC-noon calendar-day arithmetic avoids DST shifts; unknown game timezone cannot yield fabricated UTC/local tipoffs.

## Selected-season similarity

Distance = sqrt((candidate zX-target zX)^2+(candidate zY-target zY)^2). Existing qualified selected-cohort population standard deviations provide z-values. Equal axes; identical metrics rejected to avoid double counting; constant axes contribute0. Missing target/inputs yield no matches; excluded players never imputed. Six-decimal distances define tied competition ranks; deterministic ID ordering within ties. Changing the pool changes standardization. Random target is chosen only among already loaded qualifying rows, no arbitrary source IDs or hidden requests.

## Historical team participant scope

Historical roster ages derive from source DOB atOctober1,2023. Position labels grouped exactly, hybrids retained. Stats are scoped by explicit source headings; missing regular/playoff heading remains source-unspecified. Percentages with an explicit% sign divide by100; decimal ratios retain source units. Raw total fields exist only for recognized explicit MIN/REB/AST/STL/BLK/PTS columns; grouped commas validated. Published per-game values must agree with raw/GP within0.051 rounding tolerance; derived values identify their raw basis and GP0 yields unavailable. Minimum GP/search precedes participant sorting/leaders; ties retained, null values last. Roster membership and statistical participants are different source sets; no transaction dates or medical absence inferred.

## Raw shooting-type analysis

Two-point makes/attempts = raw FGM/FGA minus3PM/3PA. Known makes cannot exceed attempts. Made-shot point contributions are2×2PM,3×3PM and FTM; their known sum must equal source PTS or breakdown is withheld. Shot-type percentages use raw makes/attempts only, qualified by explicit attempt minimum1–1000 (default20); missing/zero/low denominator yields unavailable while raw counts remain visible. Two-/three-point attempt shares divide byFGA; free throws remain separate. FTrate=FTA/FGA may exceed1. Point shares require positive knownPTS; no court-zone/coordinate inference or average-to-total multiplication.

## Recorded historical cohort

Group scoped participant rows by explicit sourced NBA ID. GP sums actual source counts. A single source row retains its published numeric value; multiple-team per-game values derive only from summed explicit raw counts/GP, never rounded-average multiplication. Multiple-team percentages lack attempt denominators and remain unavailable. Custom minGP precedes ranking; absent IDs/scope/metric excluded and counted. Values descend numerically, exact ties use competition ranks; percentile=100×(lower+0.5×equal)/qualified cohort size. Search/team/page do not change that population. This is not league-wide/official eligibility.

Record maxima use only game IDs agreed by exactly two source team pages in opponent IDs, date, final scores and complementary home/away designation.9 conflicting and2 unpaired IDs quarantined;1219 source-agreed games. Metrics: highest team final score, absolute final-score margin, combined points. All ties retained; no in-game largest-lead, PBP or all-time claim.

Team comparison uses identical definitions over individually observed source-agreed regular finals; GP after quarantine shown separately, W+L=GP, winRatio=W/GP, own/opponent points averages over that sample. Final margin average is not net rating. Head-to-head includes only exact same reconciled source IDs. Hypothetical groups show independent participant-season values; pooled trade values use actual raw counts or staynull. Five-member identity selection does not imply a played lineup. Sum of individual recorded points is available only if every source count is explicit, and never represents joint performance.

Recorded cohort analytics: intersect supported qualified identities across both axes before any distribution or rank. Population SD divides squared deviation sum byN; quantiles linearly interpolate sorted index(N-1)p. Equal-width histogram ceil(sqrtN) capped12; last bin includes max, constant axis one bin, counts conserveN. z0 for constant axis. Score round(1e6*(weightX*zX+weightY*zY))/1e6; tied competition ranks. Midrank percentile100*(lower+0.5*equal)/commonN. Descriptive Pearson covariance/(N*SDx\*SDy), onlyN>=3 and nonconstant; bounded [-1,1]. No imputed targets or era/official population claim.

Shot event analysis: each genuine attempt has unique NBA game/event composite key. Preserve raw X/Y; exact source radial floor at10units/foot validated for every located event, offensive corner signs validated, no team/period flips. Reference court basket origin; negative near-basket Y and long heaves retained. FG=makes/attempts; eFG=(makes+0.5*made3s)/attempts; points/attempt=(2*makes+made3s)/attempts. Explicit minimum suppresses ratios only. Original source zone denominators;5ft square density bins floor(raw/50)\*5, counted over all filtered located rows before page. Two-player summaries independent/same filter and shared axes/count shading. CSV numeric negatives preserved; string formulas escaped. No representative league/possession claim.

Recorded discovery: jointly qualified source identity pool fixed before query/target. Equal-weight Euclidean distance sqrt((peerzX-targetzX)^2+(peerzY-targetzY)^2), population SD and constantaxisz0; six-decimal distances define tied competition ranks. Candidate target excluded, absent target no neighbors. Thresholds operate raw units X<=maxX,Y>=minY; sortYdesc,Xasc; identicalrawpairs tiedcompetitionranks. No popularity/playerquality/era claim. Randomtargets only loadedqualifiedpool. Calendarfilter sourceDate.slice(5)==MM-DD; validreferenceleapyear2000 acceptsFeb29 without UTCtipoff conversion. Source-agreed game quarantine shared with records/teamcomparison.

Observed progression groups source-agreed games bydate, applieswindow/teamfirst, resetsrunninghigh atwindowstart. At eachdate daymaximum>=previoushigh emits new-high or ties-current-high plusallgames atthatdaymaximum. Unknownwithin-dayorder notinvented; gamesexceedingpriorhighbutbelowdaymaximumarenotclaimedaschronologicalsteps. Dailymean metricvalue=sum(valueOfgame)/observedN, nullbelow minDailyGames/emptydate. Allcalendar daysmaterializedviaUTCnoon+86400000 arithmetic (notUTCtipoff); chartsegmentsbreak atnull. teamPoints noselectedteam=max(homeScore,awayScore), selectedteam ownscore; finalMargin absfinaldifference, combinedPoints sumfinalscores. No ratings/possession/era inference.

Lineup research is source reconstruction, not roster membership inference. Keep every uniquely indexed quarter report and source-native five-identity group; sum joint seconds/PM only from author-derived reports. Exact published source game-key/NBA URL joins. Whole missing-period game quarantined; no minute interpolation. Shared minutes=seconds/60; PMper48=PM\*2880/seconds, nullbelow explicitminute qualifier, rawcounts retained. Source contains no possession counts, so all possession ratings staynull. Native identities never guessed intoNBAIDs. See LINEUP_STUDY_DATA_NOTICE.md for author/licence/hash/clock checks.

Game shooting counts are grouped only over source events byexactgame/player/team IDs. Two/three attempts/makes fromobservedtypes andmadeflags; FGA=2PA+3PA, FGM=2PM+3PM, FGpoints=2*2PM+3*3PM (notfullPTS). FG=FGM/FGA,3P=3PM/3PA,eFG=(FGM+0.5\*3PM)/FGA; eachratio unavailablebelowitsattemptminimum. Allsource80game player/team counts andFGpoints reconcile; no FT/MIN/REB/AST extrapolation or nonexistentplayers/DNP guesses.

## Final closeout calculations

Recorded multi-category profiles intersect identifiable, GP-qualified supported values across all selected categories before normalization. Every category and compared player uses the same N. Competition rank is1+count(strictly greater); midrank percentile100\*(strictly lower+half tied)/N; population z=(value-mean)/SD, constantSD0 givesz0/percentile50. Missing/excluded targets have no categories or polygon. Tested [1,1,3] givesmean5/3,SDsqrt(8/9),low-tie rank2/percentile100/3,high rank1/percentile250/3. GenuineCurry26.4PPG/rank11/96.96969697percentile incommon363GP20cohort. Radararea isnot quality and eventcountpercentiles arenot defensive ratings.

Recorded team samples use both-page-agreed finals only. W+L=observedGP; homeGP+awayGP=observedGP; raw ownpoints/GP andopponentpoints/GP; finalmargin=(own-opponentpoints)/GP. MissinggameIDs=fullsource82IDsminus agreedIDs. CompleteSeason requires82agreedgames andno missingIDs. Last-ten W/L requiresall final10source-scheduleIDs; terminalstreakrequires knownsuffix andits firstopposite-resultboundary,orfullsource history; missingboundaries/duplicate sourcecalendar dateswithhold it. QueryGP/coverage/conference/metric eligibility occursbeforecompetition ranks; textsearch retainsrankpopulation. No incomplete-sample GB, officialtiebreak or possessionrating is inferred. Handcase12games(9losses at90-100,3wins at110-100) yields3-9/.25/95PTS/100oppPTS/-5margin,lastten3-7,W3;venue recordsreconcile. GenuineLAL82agreedgames47-35,home28-14/42,away19-21/40,lastten7-3,W2through2024-04-14. Global1219games correspondto2438team appearances;11IDsquarantined.
