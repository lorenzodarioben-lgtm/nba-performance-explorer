# Gap-closure plan — NBA Performance Explorer 3.1

Working backlog for the 51 original requirements that were not VERIFIED at the 3.0 closeout
(37 partial, 13 blocked, 1 deferred). Requirement text is in
[`docs/release/FINAL_FEATURE_MATRIX.md`](../release/FINAL_FEATURE_MATRIX.md); this plan never
rewords it. Outcomes are recorded in [`VERIFICATION_LOG.md`](VERIFICATION_LOG.md) and the matrix.

Categories: **A** feasible now with existing data · **B** feasible after a bounded data
integration · **C** blocked by missing source or rights · **D** deliberately deferred.

## A — feasible now (in priority order)

| ID  | Works today                                                          | Missing                                                                                                    | Smallest legitimate closure                                                                                                                                                                   | Verification                                                                             |
| --- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| H11 | "What's on tape" lists sources; every response carries provenance    | One place showing every dataset's source, licence, retrieval/revision, coverage counts and capability gaps | Data Coverage Explorer driven by a validated coverage API computed from the committed datasets (counts, revisions, retrieval dates), plus live-source status                                  | Counts reconciled against the datasets in backend tests; browser check                   |
| I11 | Unavailable fields render as unavailable                             | A per-season view of which fields exist, without implying all eras have all stats                          | Coverage-by-season: per-dataset season rows with per-field availability measured from the data; NBA.com career coverage measured per season for a chosen player from the real career response | Field-availability counts tested; real-player check (e.g. a pre-1979 career shows no 3P) |
| E08 | Recorded leaders filter by team                                      | Position filter with historically appropriate eligibility                                                  | Filter by the position each team's 2023–24 page lists for the player (guard/forward/center families; hybrid labels count for each family they name); never a modern-role guess                | Backend tests on hybrid and traded players; UI test; URL state                           |
| H05 | Team splits exist (team filter, team seasons)                        | Position cohorts with defensible definitions                                                               | Same source-listed position families as a cohort filter in the Workbench, with the definition and counts shown                                                                                | Cohort counts reconcile to the leaders filter                                            |
| A09 | Snapshot-served responses say so; retrieval times shown for archives | Distinguish current, cached, stale and unavailable for every source                                        | Only if time allows: live status of each source on the coverage page (reachable / served from committed snapshot / unavailable), no fake freshness                                            | Offline and online checks                                                                |

## B — feasible after a bounded data integration (P2)

Depends on a second verified season from a source other than the failed 2022–23 Wikipedia
team pages (see [`DATA_SOURCE_AUDIT.md`](DATA_SOURCE_AUDIT.md)).

| ID            | What a verified additional season would add                                                    |
| ------------- | ---------------------------------------------------------------------------------------------- |
| E07           | Real season selection on recorded leaders (regular season; playoffs only if the source has it) |
| E10, I02, I03 | Leaderboards, rankings and records across more than one season                                 |
| C11           | Team season intelligence for more than one season                                              |
| I05, I09      | Season comparison and record progression across seasons (still not era-normalised)             |

## C — blocked by missing source or rights (preserved, not built)

| ID                      | Obstacle                                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| A02, A06, D01, D02, E01 | No permitted, verified live/current scoreboard or standings feed (NBA CDN live data: terms restrict republication; ESPN: terms prohibit extraction) |
| A05, A08                | Same: no upcoming-game or current league snapshot feed                                                                                              |
| B15                     | No injury/availability data with usage rights                                                                                                       |
| C07, J04, J05           | No possession or substitution data                                                                                                                  |
| D06, D07, D08, D12      | No play-by-play under usable rights; quarter totals cannot stand in                                                                                 |
| F09, I10                | No defensible era model or complete cross-era statistical archive                                                                                   |
| G09                     | The only shot archive is a partial 16-team playoff sample; no representative league baseline                                                        |

## Partial and expected to stay partial (data-bound)

| ID            | Why                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| A07, D09      | Only published leader labels; no verified per-game box scores                                                            |
| B08, K03      | Records are per observed season; no complete career game archive (would need every season's NBA.com game log per player) |
| B10           | Trade stints work; no dated franchise identity mapping (tied to I06)                                                     |
| B13, H04      | Recorded cohort is 639 rows from 29 scoped teams, not a complete qualified league                                        |
| C02           | No sourced division or franchise-history table in the repository                                                         |
| C06           | No team attempt totals to weight shooting percentages                                                                    |
| C08           | Chicago's participant table has unknown scope in the source                                                              |
| C10           | No experience field in any source                                                                                        |
| D04           | Shot-archive box covers field goals only                                                                                 |
| D14           | Overtime and no-score (quarantined) states exist; no cancelled/postponed games in the data                               |
| E04, E05      | No attempts or minutes totals in the recorded rows for TS%, 3PM, per-36 or per-100                                       |
| E11           | Team rank movement by date exists; no dated player snapshots                                                             |
| I08, I09      | Bounded single-season sources                                                                                            |
| J02, J03, J06 | Lineup study is researcher-derived, not officially replayed events                                                       |

## D — deferred

| ID  | Reason                                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I06 | Dated franchise relocation mapping (including Charlotte continuity) needs a verified canonical source; none integrated. Guessing would corrupt career histories. |
