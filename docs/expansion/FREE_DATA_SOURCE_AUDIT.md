# Free data source audit

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
