# Free data source audit

## Static team identity source

The 30-team directory is from [nba_api static data](https://raw.githubusercontent.com/swar/nba_api/master/src/nba_api/stats/library/data.py),
reviewed 2026-10-14. MIT notice in `NBA_API_MIT_LICENSE.txt`
([upstream license](https://raw.githubusercontent.com/swar/nba_api/master/LICENSE)).
Only IDs, abbreviations and names; no statistics, imagery or historical aliases.
All 30 unique canonical/source IDs and abbreviations pass local route tests.
No runtime network, costs or scheduled sync. VERIFIED_AVAILABLE as static facts;
historical mapping, conference, season roster and schedule coverage unsupported.

Totals-mode `playercareerstats` fields separately passed two bounded local checks.
Curry 17 rows; Dončić 10 rows, one 2023-24 row each, required numeric inputs
validated. 466/327 ms, HTTP 2xx JSON. Existing endpoint family; no new permission
or live feed assumed. Raw provider implementation follows this checkpoint.

Checked 2026-10-14 Australia/Sydney from this Windows engineering environment.
Browser research is separate from Node/provider connectivity. Render was not tested.

| Source / URL pattern                                                                               | Purpose / fields                                                               | Terms / attribution                                                                                          | Status / decision                                                        |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Existing `stats.nba.com/stats/{commonallplayers,commonplayerinfo,playercareerstats,playergamelog}` | Existing player IDs, seasons, per-game statistics, dated PTS/REB/AST game logs | Existing accepted ADR-013 risk; NBA.com attribution required                                                 | CONDITIONAL; retain existing integration, bounded probes pending         |
| `cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json` and boxscore                | Scores, game IDs, periods, raw attempts                                        | NBA terms restrict broader republication and play-by-play; no permission artifact found                      | NOT_TESTED connectivity; DATA_BLOCKED for new integration pending rights |
| `site.api.espn.com/apis/site/v2/sports/basketball/nba/{scoreboard,summary,teams}`                  | Dates, games, rosters, scores                                                  | Disney terms prohibit automated extraction; no permission found                                              | REJECTED; no endpoint probe or adapter                                   |
| NBA league standings / leaders / shots / rosters                                                   | Records, league cohorts, raw shooting, shot locations                          | Outside existing four-endpoint ADR-013 scope                                                                 | NOT_TESTED; gated pending rights                                         |
| `sportsdataverse/hoopR`, `sportsdataverse/sportsdataverse-data`                                    | Historical events and season datasets                                          | Code/data repository licensing observed; upstream ESPN/NBA rights not established for intended republication | CONDITIONAL; no bulk download/import                                     |
| `llimllib/nba_data`                                                                                | NBA/ESPN season dumps                                                          | No license displayed on inspected root; underlying NBA/ESPN lineage                                          | CONDITIONAL; no import                                                   |
| `wyattowalsh/nbadb`                                                                                | Historical database/aggregates                                                 | MIT code license; upstream NBA rights still require separate review                                          | CONDITIONAL; no import                                                   |

Primary research: [NBA terms](https://www.nba.com/termsofuse),
[Disney terms](https://disneytermsofuse.com/english/),
[nba_api](https://github.com/swar/nba_api),
[hoopR](https://github.com/sportsdataverse/hoopR),
[sportsdataverse-data](https://github.com/sportsdataverse/sportsdataverse-data),
[nba_data](https://github.com/llimllib/nba_data),
[nbadb](https://github.com/wyattowalsh/nbadb).

NBA broader statistical reuse requires permission review. Existing ADR-013 remains
the repository's accepted risk decision, not permission for unrelated new feeds.
No raw traffic, cookies, credentials, imagery or bulk datasets are captured.
No source is treated as working based on a README. Connectivity, row counts,
latency and schema evidence will be recorded after actual probes.

Existing cache: 500-entry process LRU, in-flight deduplication, 5-minute current
game logs, 7-day historical game logs, 1-minute empty results, zero automatic retries.
No paid services, database or durable Render filesystem are required.

## Executed existing-source evidence

Bounded opt-in local Node probe at 2026-10-13T16:24:14.079Z (2026-10-14 Sydney): all 12 checks returned HTTP 2xx JSON and passed the actual provider mappers. Four existing endpoint families only. No retries; 5-second timeout; stop after two consecutive failures. Latencies 288–1,932 ms. Curry search 7; profiles 1 each; career seasons Curry 17, LeBron 23, Wembanyama 3, Jordan 15, Doncic 8; Curry 2023-24 game records 74. No raw traffic or dataset republished. Existing integration is technically VERIFIED_AVAILABLE locally with ADR-013 usage caveats; Render untested. Previously empty LeBron response was nonempty now. Reproduce with npm run smoke:free-sources; not part of CI.
