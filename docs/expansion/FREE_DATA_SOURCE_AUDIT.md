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

## Implemented source boundaries / latest actual evidence

Separate NbaSeasonTotalsProvider uses the EXISTING playercareerstats endpoint with
PerMode=Totals, never PerGame-to-total multiplication. Required columns:
PLAYER_ID, LEAGUE_ID, SEASON_ID, TEAM_ID, TEAM_ABBREVIATION, GP, MIN, PTS, REB,
AST, TOV, FGM, FGA, FG3M, FG3A, FTM, FTA. Genuine engine acceptance exercised
mapped source totals for Curry, LeBron and Wembanyama, including all required
columns, player/scope/count matching and exact TS/eFG inputs. Unique traded
aggregate handling, duplicate/missing/null/zero/timeout cases verified offline.
Raw records <=150, 100-entry career LRU, 6-hour TTL (empty 1 minute), no retries,
three simultaneous bounded research jobs; no broad league crawl or durable database.

Local technical status VERIFIED_AVAILABLE for the four existing named endpoint
families plus tested Totals parameter mode; usage remains CONDITIONAL under ADR-013.
No new NBA endpoint family or ESPN integration enabled. Source published as-of
unknown, legacy retrieval unknown; new raw response fetch time recorded. Runtime
schema/HTTP failures remain sanitized/unavailable, never fixture substitution.
Production-host reachability for expansion remains NOT_TESTED. Successful local
requests do not establish permission, fresh publication or cloud-host availability.

No approved rights-cleared league/game/shot/lineup/archive dataset was established.
NBA broader feed integration BLOCKED pending usage review; ESPN REJECTED by its
published extraction restriction; historical candidates CONDITIONAL, not imported.
Code licenses do not license upstream statistics. Static MIT identities include
notice; no imagery/statistical archive redistribution or NBA CSV export added.

## Existing-family extension evidence, resumed 2026-10-14

Career totals/peak/milestones/trends reuse playercareerstats Totals and the existing individual-player source policy. No new endpoint family or league database enabled. Bounded probes (`probe-postseason-fields.ts`) found numeric raw shooting/defensive fields in SeasonTotalsPostSeason (10 Curry rows) and PlayerGameLog SeasonType=Playoffs (13 Curry 2022-23 games). Timeouts 5s, no retries, abort on failure. Do not conflate this local probe with production-host verification or broader republication permission.

## Raw-game and postseason checkpoint (2026-10-14)

The two existing-family postseason probes led to a verified separate provider, never changing legacy PlayerProvider. Local real API acceptance confirmed strict SEASON_ID 2+startYear regular and 4+startYear playoffs mappings. No broader endpoint permission is assumed. A new free candidate was examined: Wikidata structured facts have CC0 rights (https://www.wikidata.org/wiki/Wikidata:Copyright), public narrow query access (https://www.wikidata.org/wiki/Wikidata:Data_access). Two bounded local queries returned84 unique labels: six Summer League labels must be excluded; 1999–2000 is a legitimate four-digit ending; six recent/future NBA seasons lack winner statements. Current entity labels may differ from historical franchise names (e.g. 1949 season modern Lakers label). Candidate integration not yet implemented or host verified; never infer missing champions or historical names.

## CC0 history and qualification checkpoint (2026-10-14)

Wikidata history integration enabled from primary CC0 structured-data licensing and official data-access guidance: https://www.wikidata.org/wiki/Wikidata:Copyright and https://www.wikidata.org/wiki/Wikidata:Data_access. Fixed P3450 NBA league/P1346 winner query, LIMIT101; max250k decoded bytes,10s timeout, no retry,24h deduplicated cache,429 Retry-After cooldown (60s minimum,24h maximum), truthful project User-Agent. Text/media licensing is not imported. Genuine local public API accepted78 season entities,84 raw rows,6 Summer League exclusions,6 missing champions; production host not tested. Two subsequent commonplayerinfo birth-date probes passed identity/calendar/format at20:10:42–43Z; age feature not yet implemented.

## Licensed Wikimedia archive (2026-10-14)

The previous statement that no archive dataset was established is superseded for this narrow slice. Public MediaWiki parse API reads succeeded for two fixed pages: 2023–24 NBA season and2024 NBA playoffs. Rights/access guidance was verified from Wikimedia Terms of Use section7, Foundation API usage guidelines and MediaWiki parse documentation. Adapted structured data carries revision/contributor attribution, CC BY-SA4.0 licence and modification notice; no article prose or imagery reused. See WIKIPEDIA_DATA_NOTICE.md. Local parsers accepted30 standings,27 published leader entries and82 recorded finals, including3 overtime games. Static current team names are matched exactly only within this2023–24 slice; game IDs come from published NBA recap URLs. Unknown timezone stays null. Broader current/live feeds and all-player ranking populations remain unavailable.

## Historical team source compatibility

The licensed archive now permits the30 fixed2023–24 team-season pages in addition to its two league/playoff pages. Static team IDs constrain titles; no arbitrary page input. One serial30-page compatibility audit completed; source responses saved only in OS temp for diagnosis, never a runtime fallback. All30 rosters and82 regular finals per team passed source identity, chronological game numbers and cumulative W–L reconciliation. Opponent IDs use explicit season-page links; repeated unlinked names only reuse an identical explicitly mapped label from the same page. No fuzzy city/name joins.

Participant headers include percentage/per-game and raw-total/per-game layouts. Explicit percent signs normalize to ratios; comma-grouped raw counts are preserved and published per-game values reconcile within0.051. Chicago’s18 participant rows lack an explicit regular/playoff heading and remain source-unspecified.29 pages expose639 regular participant rows; no league-wide unique-player or official qualification claim. Exact source article P3647 mappings use bounded public Wikidata CC0 queries; first genuine Lakers/Celtics rosters mapped18/18 and17/17 IDs. No diagnosis, salary or contract prose imported.

## Explicit genuine recorded dataset

A fixed2023–24 dataset was assembled from the30 already verified public team-page responses, with per-page revision/retrieval/licence metadata and exact article identity facts from10 bounded serial Wikidata queries.575 distinct source articles,566 mapped entity facts; missing NBA IDs remain null. This is independently licensed genuine recorded data, not synthetic fixtures or an automatic live fallback. Runtime recorded routes make zero upstream requests and leave NBA/Wikipedia live providers unchanged. File recorded-snapshot.json contains adapted structured facts only; no HTML, images, article prose, salary or clinical records. CC BY-SA4.0 applies to adapted data; CC0 to identifier facts.

Paired source reconciliation found1230 game IDs:1219 agree in teams/date/scores/home-away,9 conflict and2 unpaired. Conflicting/unpaired IDs are quarantined from extrema rather than guessed or silently fixed.639 regular participant rows across29 pages,18 Chicago unknown-scope rows separate. Default GP20 produces363 supported qualifying players;17 missing-ID rows and59 metric/trade exclusions at that selection. Rankings/percentiles describe this defined source cohort only, not an official complete/current league.

## Further free shot-data investigation (2026-10-14)

Primary dataset card https://www.kaggle.com/datasets/boonpalipatana/nba-playoff-shots-2018 and public metadata API declare CC0: Public Domain, Boon P, v1 last updated2018-06-06T22:04:48.633Z, original provenance stats.nba.com. Kaggle official https://www.kaggle.com/docs/api and https://www.kaggle.com/discussions/product-announcements/485439 document unauthenticated public data downloads. Two normal bounded public metadata reads and one download succeeded without account/key/evasion/retry. CSV2,751,496bytes SHA2561e97afe9574d133e3f2e5db20130604605c10a6763b0516a58051aab78274cf6;13,470 rows,203players,16teams,80games,2018-04-14 through06-03. Contains authentic IDs,event IDs,made/missed flags, source zones/distance/rawLOC_X/LOC_Y. Coverage stops before playoffs end; not complete season/current league. Coordinate units/orientation not established by card; preserve raw axes and long heaves, do not guess court calibration. Candidate available for next implementation. GitHub shufinskiy/nba_data has Apache2 code licence, but separate broad upstream data redistribution rights remain unverified; no integration on that basis.

The earlier Kaggle shot candidate is now integrated as explicit immutable recorded data. Six genuine local checks passed, unchanged source hash in dist and zero runtime source requests. Full13,470-row radial scale and corner signs establish coordinate reconciliation; nbadb primary guide corroborates basket orientation. No image/media/remote code reused. Court rules reference read normally; linked diagram403 was not bypassed. SHOT_DATA_NOTICE.md preserves version/licence/coverage/evidence.

FurtherPBPcandidate schmadam97/nba-playbyplay-data-20182019 publicmetadata marksOther(specifieddescription),698MB andBasketballReferenceorigin; noexplicitlicence found. Notintegrated. ScholarlyDataverseDOI10.57745/9NVFIQ,ArnaudOdet, declaresEtalabOpenLicense2.0, publicunrestricteddata.zip125,578,161bytes/file744185/MD5dee0454ff932339714192c4031006972. Metadata+README+checksumverified; noaccount/payment/anti-botbypass. Onlyresearcher-createdprocessedCSVinspected, norawPBP/foreigncode/picklerun. 2017-18stats50,237quarterlineuprows/1,230regular games/13,869unique5personlineups/540nativeBRIDs/30teams. Allquartertime720secs/300OTandopposingPMsum0; nozero/negative durations;5uniqueIDsperrow. Sourceheaders time/pm, nopossessioncounts. Potentialsharedminutes/observedPM source, notORtg/DRtg/NetRtg. PrimarylicenceURI https://spdx.org/licenses/etalab-2.0.html requiresproducer/source/updateattribution andtruthfulmodifieddata. Producer/sourceacknowledgment andnoendorsementmustbe shown. OriginalrawBR/KagglePBPrightsare notassumedcleared byprocessedresearchlicence. Candidate remainsresearchpendingselectiveimport/method/fields checks.

Scholarly lineup source now selectively imported as clearly researcher-reconstructed joint reports under the publisher's explicit Etalab2 data grant. Primary license text guarantees reuse rights, requires producer/source/update attribution and avoids endorsement/misrepresentation. Only author-created processed CSVs adapted; no raw underlyingPBP/foreigncode/pickle/media. Deep audit found missing overtime period6 in2017-12-15PHI/OKC: entire game plus2 exclusive groups quarantined. Retained1229games/13867groups/50182reports; known period clocks and opposingPM reconcile. Dataset3.78MB fixed/no networkstartup; native identifiers unguessed, no possession ratings. Full709/genuine local acceptance passed; LINEUP_STUDY_DATA_NOTICE.md records checksums/provenance/limits.
