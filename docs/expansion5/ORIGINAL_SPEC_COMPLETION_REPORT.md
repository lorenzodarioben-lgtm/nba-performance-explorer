# Original specification completion report — NBA Performance Explorer 3.2

The original Codex specification has 134 requirements. After 3.1, 47 were not verified. 3.2
implemented all 47 as complete vertical slices, each with:

- real data;
- UI;
- correct calculations;
- loading, error and missing-data states;
- provenance;
- mobile and keyboard support;
- tests.

Per-row evidence is in [`FINAL_FEATURE_MATRIX.md`](../release/FINAL_FEATURE_MATRIX.md). Sources
and checks are in [`DATA_INTEGRATION_REPORT.md`](DATA_INTEGRATION_REPORT.md). The run itself is
in [`EXECUTION_LOG.md`](EXECUTION_LOG.md).

| Status   | After 3.1 | After 3.2 |
| -------- | --------: | --------: |
| VERIFIED |        87 |       134 |
| PARTIAL  |        33 |         0 |
| BLOCKED  |        13 |         0 |
| DEFERRED |         1 |         0 |
| Total    |       134 |       134 |

VERIFIED means that the requested behaviour works within the requirement's permitted scope, with
tests. Each 3.2 row states the scope that remains, such as:

- play-by-play from 1996-97;
- lineups from 2007-08;
- 11 team-only seasons;
- one shot season.

## What unlocked the 47

| Dependency                                     | Requirements unlocked                                                                                                       | Source                                                                       |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| A reconciled multi-season league archive       | B08, B10, B13, B15, C02, C06, C08, C10, C11, D04, D09, D14, E01, E04, E05, E07, E10, E11, H04, I02, I03, I05, I06, I09, K03 | NBA.com Stats league archive, 43 seasons                                     |
| A live schedule, scoreboard and standings feed | A02, A05, A06, A07, A08, A09, D01, D02                                                                                      | NBA.com CDN and Stats, on request, cached                                    |
| Play-by-play events                            | D06, D07, D08, D12                                                                                                          | NBA.com CDN and Stats v3                                                     |
| Possessions and source-calculated ratings      | C07, J02, J03, J04, J05, J06                                                                                                | NBA.com Stats Advanced, lineups, on/off                                      |
| A league-relative model with stated caveats    | F09, I10                                                                                                                    | Archive league rates; the index is not an era model                          |
| A representative league shot baseline          | G09                                                                                                                         | NBA.com shotchartdetail LeagueAverages, 2017-18 playoffs                     |
| Independently verified honours                 | I08                                                                                                                         | Archive Finals, NBA.com franchise data and playerawards, Wikipedia, Wikidata |

## By module

**A — Home and game day**

- **A02, A06, D01:** `/games` lists any date from the archive, plus NBA.com's live schedule for
  the season under way. Times are in the reader's locale, and games carry the source's own
  states.
- **A05:** every scheduled game links to a working `/games/nba:<id>` page.
- **A07:** shows the day's leading box-score marks, with ties. They are never framed as an award.
- **A08:** the snapshot shows the season, as-of date and phase.
- **A09:** a source status board reports current, cached, stale, unavailable or not-contacted
  states from real request outcomes.

**B — Players**

- `/players/:id/records` holds:
  - the career timeline, with traded stints separate and gaps marked;
  - availability (games played against team games in each stint's span, never a reason);
  - season highs and lows, and career highs with every game at the mark;
  - milestones dated to the game (K03);
  - percentile bars against the season's qualified population, with n.

**C — Teams**

- Team pages for any archived season cover:
  - franchise identity periods;
  - record splits, including neutral sites;
  - box totals and shooting;
  - NBA.com ratings from 1996-97, stated as unpublished before;
  - leaders;
  - rosters with positions, experience and ages;
  - the franchise's full season history.

**D — Games**

- Game pages merge the archived box score with NBA.com starters, the line score and the venue.
- Play-by-play from 1996-97 comes with:
  - a keyboard scrubber and filters;
  - lead changes, ties and largest leads, which equal NBA.com's counts on checked games;
  - scoring runs (8+ unanswered points), with the heuristic stated.
- Canceled, postponed, overtime and TBD games keep their own states.

**E — Standings and leaders**

- Standings for every season, plus the live current table.
- Leaders for any season and scope, in totals, per game, per 36 or per 100 (NBA.com
  possessions).
- Shooting leaders require attempt minimums.
- Dated leaderboard movement is recomputed from the games through each date.

**F, I — History and eras**

- **F09, I05, I10:** `/history/eras` shows the league's environment season by season, with:
  - decade browsing;
  - a two-season comparison;
  - a raw versus league-relative player toggle, with its caveats.
- **I03, I09:** the record book.
- **I02:** team rankings.
- **I06:** franchise continuity.
- **I08:** champions and seven awards (`/history/champions`).

**G — Shots**

- Shot Studio adds NBA.com's 2017-18 playoff league averages for each zone. They cover all 82
  games, reconcile with the box scores, and are labelled as not narrowed by filters.

**H — Analysis**

- **H04:** league distributions with a player marker and sample size.

**J — Lineups**

- `/lab/lineups/nba` shows NBA.com's five-player units and on/off splits for any team from
  2007-08, with:
  - minutes, possessions and source-calculated ratings;
  - a side-by-side comparison of two units.

## Repository fix found during 3.2

The `.gitignore` rule `coverage/`, meant for test-coverage output, also matched
`backend/src/features/coverage/`.

- `app.ts` imported a module that had never been committed, so a clean clone of the pushed
  branch could not build.
- The rule is now anchored to the test-output folders, and the feature is tracked (commit
  `36ecae3`).
