# Data source audit — NBA Performance Explorer 3.1

Bounded investigation (P2) of an additional historical source that could unblock the
category-B gaps in [`GAP_CLOSURE_PLAN.md`](GAP_CLOSURE_PLAN.md). Audited 2026-10-16.

**Decision: BoxScore Lab is not integrated.** Its 2023–24 data passed the quality gate, but the
licence gate failed. The dataset openly republishes NBA Stats data, and BoxScore Lab cannot grant
rights over that data that the NBA's own terms withhold. No BoxScore Lab file or value is in the
repository, and category B stays open.

## 1. What the source offers

| Item           | Finding (from https://boxscorelab.com/downloads/ and /methodology/)                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files          | 12 CSVs, 1.7 MB in total, covering 2022–23 to 2025-26. Per season: player season totals (32 columns), team standings (15 columns) and team game results (29 columns, 2,460 rows) |
| Build          | `20261015T1135`: nightly during the season and stopped out of season. "Data through October 15, 2026"                                                                            |
| Origin         | "Statistics come from NBA Stats, the league's own public data". Box scores and the other league datasets are copied; possessions, ratings and percentiles are derived            |
| Identifiers    | **None.** No NBA player ID or game ID; players are identified by name only                                                                                                       |
| Scope          | Not defined on either page. The game file is the regular season only (2,460 rows = 1,230 games × 2)                                                                              |
| Traded players | One row per player under one team, with season-combined totals. No per-stint rows                                                                                                |
| Positions      | A `position` column exists, but it is empty in all 572 rows for 2023–24                                                                                                          |

## 2. Licence gate — failed

- **What BoxScore Lab states:** the CSVs are "published under CC BY 4.0" with dated attribution.
  - The sprint brief described this as a CC BY-SA claim.
  - The live page says CC BY 4.0.
  - The discrepancy is recorded here; it does not change the outcome.
- **The upstream terms ([NBA.com Terms of Use](https://www.nba.com/termsofuse)):**
  - Section 1 limits downloads to personal, non-commercial use and prohibits republishing Basketball Content.
  - Section 9 (NBA Statistics) allows the statistics to be "used, displayed, or published" only for legitimate news reporting or private, non-commercial purposes.
  - Section 9 also requires the Operator's express prior consent for any product that features a database of comprehensive, regularly updated statistics.
- **Why the gate fails:**
  - BoxScore Lab says the box-score data is copied from NBA Stats and that it is not affiliated with the NBA.
  - It does not say it has the NBA's consent.
  - A downstream licence cannot add permissions the upstream terms withhold. So the CC BY 4.0 grant covers BoxScore Lab's own derived work (its ratings and estimates), not the league's statistics.
  - Committing full league season files to this public repository would be the "database of comprehensive statistics" that Section 9 names.
- **Contrast with what the app already does:**
  - NBA.com Stats is contacted on request for an individual reader's research and is never committed.
  - The recorded archive is Wikipedia text under CC BY-SA 4.0, with Wikidata CC0 identities.
  - Neither path redistributes a league statistics database.

This is a reading of published terms, not legal advice. The owner can reopen the question if
BoxScore Lab confirms a licence from the NBA (see §5).

## 3. Quality gate — passed (2023–24 against the committed archive)

Only the three 2023–24 files were downloaded, to a session scratch folder outside the repository.
The comparison script read them as data and was not committed.

**Team game results**

- All 2,460 archive team-game rows found a BoxScore Lab row by team, date and opponent. None were missing.
- Win/loss: 0 differences. Home/away: 0 differences.
- Scores: 9 differences. These are exactly the 9 games the archive already quarantines as conflicting because the two Wikipedia team pages disagree:
  - `0022300174`, `…182`, `…391`, `…447`, `…548`, `…853`, `…900`, `…979`, `…992`
  - In every case BoxScore Lab agrees with one of the two pages.
- Every one of the 1,219 games the archive treats as agreed matches BoxScore Lab exactly.

**Standings**

- W–L derived from the archive's results equals BoxScore Lab's standings for all 30 teams.

**Players**

- Compared the 460 archive players who had a single team and could be matched by normalised name and team.
- GP: 0 differences.
- PPG, RPG and APG: 0 differences beyond one-decimal rounding.
- FG%: 1 difference. Tristan Thompson (CLE): the archive says 0.608; BoxScore Lab totals give 0.6134.

**Matching gaps**

- 10 names did not match: suffix and spelling variants such as "Mike Conley Jr." and "Jimmy Butler".
- 6 players were listed under a different single team.
- Name-only identity is a real integration cost. Every row would need an identity bridge to NBA IDs, and the bridge could not be verified from this source.

**Conclusion:** the numbers are trustworthy. The license is the only blocking issue.

## 4. Other candidates considered (not pursued this session)

| Source                          | Status                                                                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wikipedia 2022–23 team pages    | Already audited and not ingested: only 10 of 30 pages were clean under the strict audit (duplicate recap IDs, preseason rows, malformed links), see `docs/expansion3/SOURCE_NOTES.md` |
| Basketball-Reference / Stathead | Terms prohibit scraping and redistribution; not contacted                                                                                                                             |
| NBA.com Stats (live)            | Already used on request; committing its output would hit the same Section 9 restriction                                                                                               |
| Kaggle mirrors of NBA Stats     | Same upstream problem as BoxScore Lab, usually with weaker provenance                                                                                                                 |

## 5. What would unblock category B

1. **Written NBA consent.** Written confirmation from BoxScore Lab that the NBA permits its redistribution, or the NBA's own consent for this project.
   - With either one, the gate in §3 is ready to rerun, and the comparison script is easy to rebuild from this description.
   - Integrating would still need an NBA-ID identity bridge for the 572 name-only rows.
2. **A second season from the CC BY-SA route.** Another season of Wikipedia team pages that passes the same scope gate as 2023–24.
3. **Live-only routes.** Live NBA.com requests per reader (already in place) can cover more seasons for one player at a time. They cannot support committed multi-season leaderboards.

## 6. Related finding: roster identities on live team pages

During the P0 live check, all 30 current Wikipedia 2023–24 team pages matched the committed
snapshot's results exactly. For 8 teams, the live roster now carries player article URLs that
were null in the snapshot (additions only; no value changed). The snapshot was **not** refreshed
in 3.1, because doing so would shift published identity and cohort counts late in the cycle. A
deliberate re-snapshot with recounted documentation is listed in `HANDOFF.md` as an owner
option.
