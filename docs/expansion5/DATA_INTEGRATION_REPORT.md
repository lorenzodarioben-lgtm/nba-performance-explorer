# Data integration report — NBA Performance Explorer 3.2

This report covers every dataset that 3.2 added or reopened: what it is, how it is accessed,
how its quality was checked, how identities are kept, what it covers, where it came from and
what restrictions apply.

## Owner authorisation and what it does not cover

The owner authorised development use of publicly accessible NBA data, including NBA.com
endpoints, and reopened BoxScore Lab as a candidate source. The owner accepts the third-party
reuse risk for this personal, non-commercial project.

That authorisation is not a licence from the NBA or from any provider, and this report does not
claim one. No provider has been shown to authorise redistribution. The decision to publish any
dataset or feature remains the owner's (see [Publication decisions](#publication-decisions)).

Accepting a legal risk says nothing about whether the data is correct, so every dataset below
went through the same data-quality checks as before.

Access rules followed throughout:

- No authentication, CAPTCHA, paywall, rate-limit or access-control bypass.
- No proxy or IP rotation, and no paid data.
- Requests are spaced, cached and sent from one host with an honest user agent:
  - NBA.com build scripts: 1.5 s apart.
  - Wikipedia: 6 s apart, after one 429 response was respected.

## 1. NBA.com Stats league archive (committed)

**Contents**

- 43 seasons, 1983-84 to 2025-26: 49,117 regular-season and 3,375 playoff games.
- 132 files in `backend/src/features/league/data`, about 21 MB in total.

**Endpoints used**

- `leaguegamelog`: team and player logs, regular season and playoffs.
- `leaguestandingsv3`.
- `leaguedashteamstats`: Advanced.
- `leaguedashplayerstats`: Base and Advanced, including possessions.
- `boxscoretraditionalv3`: designated home team at neutral sites.
- `commonteamroster`: every team season.
- `franchisehistory`, `teamdetails` and `teamyearbyyearstats`.

**Access.** Offline build scripts:

- `build-league-archive.ts`
- `build-league-extras.ts`

Responses are cached on disk. The app reads only the committed, gzipped files.

**Integrity.** `index.json` and `extras-index.json` pin a SHA-256 for every file, and the loaders
refuse a file whose digest or Zod schema does not match.

**Quality gates**

- **Box-score gate.** Each game's player lines must sum to the team line on PTS, FGM, FGA, FTM
  and FTA. A season keeps player statistics only if at most 0.5% of its box scores fail.
  - 11 seasons fail and are team-only: 1983-84 to 1986-87, 1988-89, and 1990-91 to 1995-96.
  - 752 incomplete box scores are counted across all seasons.
- **Restatements.** Where NBA.com's season totals differ from the summed game lines, a
  restatement is kept as a season note and not hidden. A restatement means the same games
  played, every difference within 2, and points within 3.
- **Quarantine.**
  - One game: the canceled 2013-04-16 BOS–IND game, listed without a score.
  - It is shown as not played and is excluded from every calculation.
- **Field coverage.** NBA.com did not record 3PA, OREB/DREB, STL, BLK and TOV in most 1983-85
  games. These stay null, never zero, and any rate that needs them is withheld.
- **Unreliable fields.** Raw counts in `teamyearbyyearstats` are zero for older seasons, so only
  W-L, ranks, playoffs and Finals results are taken from it.

**Reconciliations**

- _Wikipedia 2023-24 (independent)._ All 1,219 games that both team pages agree on match the
  archive. 11 games are disputed between Wikipedia pages.
- _BoxScore Lab 2022-23 to 2025-26 (cross-check only, not committed)._
  - Games: all 2,460 team-game rows match in every season.
  - Standings: all 30 match in every season.
  - Players: every player was resolved by name.
  - Remaining player differences are single-unit restatements:
    - 2022-23: 7 of 539
    - 2023-24: 5 of 572
    - 2024-25: 0 of 569
    - 2025-26: 6 of 582
  - Home and away differ only at the 10 neutral-site games, where BoxScore Lab lists the other
    team as home.
  - CSV fingerprints (SHA-256, first 12 characters):

    | Season  | Results        | Standings      | Player totals  |
    | ------- | -------------- | -------------- | -------------- |
    | 2022-23 | `40b9a2c4f50d` | `02da13b246c0` | `71bc989c1eba` |
    | 2023-24 | `3f181cbcc8bd` | `d6ae0f046eb6` | `c11f054cfb6d` |
    | 2024-25 | `61d696baa530` | `674d4df1619e` | `1e40bcfa70ea` |
    | 2025-26 | `f2872cc98025` | `3b69cd18bc3a` | `629839481dcb` |

  - The CSVs stay outside the repository. `reconcile-boxscorelab.ts` repeats the check.

- _Play-by-play._ Lead changes, times tied and biggest lead derived from NBA.com events equal
  NBA.com's own box counts on MIL–ATL 2024-12-14 and 2026 Finals Game 5. Where the biggest run
  differs, the page shows both values.
- _Real-history spot checks._
  - LeBron James reached 30,000 points on 2018-01-23 and 40,000 on 2024-03-02.
  - His career high is 61, against CHA on 2014-03-03.
  - Games played: 55 in 2018-19, 67 of 71 in 2019-20, 71 in 2023-24.

**Identity**

- NBA.com person IDs and team IDs are used as given.
- A franchise keeps one team ID through relocations and renames: Seattle → Oklahoma City, New
  Jersey → Brooklyn, and Charlotte's 1988–2002 Hornets stay with Charlotte.
- Team names are those of the season.
- Traded players keep a separate stint per team.

## 2. NBA.com live sources (not committed)

| Source             | Endpoint                                            | Cache                   | Coverage       |
| ------------------ | --------------------------------------------------- | ----------------------- | -------------- |
| Schedule           | cdn `scheduleLeagueV2.json`                         | 10 min                  | Season         |
| Scoreboard         | cdn `todaysScoreboard_00.json`                      | 20 s                    | Today          |
| Box score          | cdn `boxscore_<id>`, Stats `boxscoretraditionalv3`  | Finals 1 day, else 20 s | 2019-20+ (cdn) |
| Play-by-play       | cdn `playbyplay_<id>`, Stats `playbyplayv3`         | Finals 1 day, else 20 s | 1996-97+ (v3)  |
| Standings          | Stats `leaguestandingsv3`                           | 5 min                   | Current season |
| Lineups and on/off | Stats `leaguedashlineups`, `teamplayeronoffdetails` | 1 hour                  | 2007-08+       |

**Client.** `NbaLiveClient` (`league-live.ts`):

- Fixed hosts and paths; IDs are validated before a URL is built.
- One timeout, no retries.
- In-flight requests are de-duplicated.
- Each source records its last success and failure for the status board.
- The source update time is the HTTP `Last-Modified` header. In-body times are not used because
  they mix time zones and clock formats.

**Offline.** Every live page states that the live source is unavailable, and archived data keeps
working.

**Coverage boundaries checked**

- Play-by-play: a 1996-97 game returns 469 events, and a 1995-96 game returns none.
- Lineups: NBA.com publishes no lineups before 2007-08, and the API refuses those seasons.

**Lineups example.** Live check of the 2023-24 Celtics:

- 391 five-player units.
- Top unit: 623 minutes, 1,317 possessions, ORtg 120.3, DRtg 109.4.

Ratings are shown as NBA.com publishes them and are never recomputed.

## 3. NBA.com league shot zones, 2017-18 playoffs (committed, 20 rows)

**Source.** `shotchartdetail` with PlayerID=0, TeamID=0, SeasonType=Playoffs, Season=2017-18.

- The LeagueAverages result set is committed as raw FGA/FGM counts:
  `backend/src/features/shot-archive/league-zone-averages.json`.
- It records the response's SHA-256 (`fadb8b64…`) and the retrieval time.

**Reconciliation**

- LeagueAverages totals (13,816 FGA, 6,294 FGM) equal NBA.com's shot-chart detail for the same
  request.
- They also equal the archive's box scores on all 164 team-game lines (FGA, FGM, 3PA, 3PM).
- The 20 zone rows equal the detail regrouped by zone.

**Relation to the shot archive**

- The committed Kaggle CC0 archive is exactly NBA.com's events for the 80 games it holds. All
  13,470 rows were found.
- It lacks 2018 Finals Games 3 and 4 (`0041700403` and `0041700404`).
- The loader refuses a baseline with fewer attempts or makes than the recorded events in any
  zone.

**Use.** Shot Studio shows, for each zone:

- the league's share of attempts;
- the league's FG%;
- the filtered group's FG% gap.

The baseline is labelled as covering all 82 games and as not narrowed by the page's filters.

## 4. Champions and awards (committed derived facts)

**Champions**

- Derived at runtime from the archived Finals games. The Finals are the last playoff pairing,
  because game IDs before 2001 do not encode the round.
- All 43 champions, 1983-84 to 2025-26, are checked against three other records:
  - NBA.com franchise titles (year and opponent);
  - NBA.com team-by-year Finals result;
  - Wikipedia's Finals MVP team.
- All 43 agree with every record that covers them.

**Awards** (`backend/src/features/league/data/honours.json`, built by `build-league-honours.ts`)

- Seven awards: MVP, Finals MVP, Defensive Player, Rookie, Sixth Man, Most Improved and Clutch.
  Each season's winner comes from that award's Wikipedia article; the revision ID is stored.
- **Name matching.** A name resolves to an NBA.com ID only if exactly one player of that name is
  on that season's NBA.com rosters or box scores.
  - Initials are compared with spaces removed, so "J. R. Smith" matches "JR Smith".
- **Renamed players.** These are resolved through Wikidata's NBA.com player ID (P3647) for the
  linked article, never by guessing a name. The ID must also be present that season.
  - Ron Artest → 1897
  - Chris Jackson → 51 (Mahmoud Abdul-Rauf)
  - Isaac Austin → 1134
- **Confirmation.** NBA.com `playerawards` for that ID must list the same award and season.
- **Result.** 262 Wikipedia rows; 261 are confirmed by NBA.com and listed.
- **Documented gap.** Eddie Johnson's 1988-89 Sixth Man award: NBA.com lists no awards at all
  for player 698. The page shows it as a gap, not as a winner.
- **Stored data.** Only facts are stored: season, award, NBA.com ID, name, and team as NBA.com
  gives it. No article text is stored. Every request URL is recorded with its retrieval time and
  SHA-256.

## 5. Datasets unchanged from 3.1

- Kaggle CC0 2018 playoff shots.
- 2017-18 lineup research snapshot.
- Wikipedia 2023-24 season and playoff archive.
- Wikidata season champions.

These keep their existing provenance and licences. See
[`../expansion4/DATA_SOURCE_AUDIT.md`](../expansion4/DATA_SOURCE_AUDIT.md).

## Restrictions and owner-accepted risks

| Data                       | Restriction recorded                                                                                                         | Status                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| NBA.com Stats and CDN data | Governed by NBA.com's Terms of Use, which this project has not had reviewed; no licence or redistribution permission is held | Used under the owner's accepted risk; attribution on every response (`source: nba-stats`) |
| BoxScore Lab               | Republishes NBA Stats data; failed the 3.1 licence gate                                                                      | Cross-check only; nothing committed                                                       |
| Wikipedia                  | Text CC BY-SA 4.0                                                                                                            | Facts only; article and revision linked from the page                                     |
| Wikidata                   | CC0                                                                                                                          | Used for identity (P3647) only                                                            |
| Kaggle 2018 shots          | CC0 (publisher's declaration)                                                                                                | Unchanged                                                                                 |

## Publication decisions

Nothing has been deployed. The following are the owner's decisions:

- whether to publish the NBA.com-derived archive (21 MB) and the live NBA.com features;
- whether to keep NBA.com-derived features local-only.

`docs/release/DEPLOYMENT_RUNBOOK.md` lists what a public deployment would ship.
