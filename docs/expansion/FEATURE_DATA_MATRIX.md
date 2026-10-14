# Feature data matrix

Reviewed 2026-10-14 Australia/Sydney. Existing NBA source remains conditional under
ADR-013 usage risk; no new league feed enabled. Genuine access below is LOCAL,
not Render. Full feature-by-feature statuses live in FEATURE_LEDGER.md.

| Feature IDs                                                               | Inputs / source actually available                                                                               | Coverage / freshness                                                                                     | Route / tests / degradation                                                                                                                                |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01,A10                                                                   | Implemented routes, capability report, existing NBA search                                                       | Cached directory, NBA person IDs; configured fixture mode prominent                                      | /explore; explorer tests and live browser search/navigation; no dead new-module links                                                                      |
| A09,H11                                                                   | source, servedAt, nullable retrievedAt/asOf, warnings, capability gates                                          | Legacy source timestamps unknown; raw totals fetch time known; no live promise                           | SourceNote and /api/data-sources/status; real API/browser verification; production host unverified                                                         |
| B02,B03,B05,B06,B07,B08                                                   | Unique dated games, team/opponent abbreviations, W/L, home/away, PTS/REB/AST/integer MIN; existing playergamelog | Regular season; up to 150 observed rows; sample/count mismatch warns; 5-minute current, 7-day past cache | /players/:id/insights; stats-core, route and UI tests, 74 real 2023-24 games and 2 BOS records; empty averages null, corrupt source 502                    |
| B04                                                                       | Same observed games                                                                                              | Home/away means verified; game attempts not exposed, shooting splits unsupported                         | Same route; partial feature, no averaged shooting percentages                                                                                              |
| B01,H02                                                                   | Verified playercareerstats PerMode=Totals, 17 required identity/count fields, unique traded aggregate            | Regular-season selected totals, nullable missing fields, 6-hour cache / 1-minute empty                   | /api/players/:id/totals; raw provider/formula/API/UI tests and live TS/eFG input reconciliation; fixture runtime explicitly unsupported                    |
| B10                                                                       | Existing available-season/team summaries                                                                         | Reported years/team abbreviations, TOT no single team; no relocation/transfer dates                      | Season selector only, no full timeline claimed                                                                                                             |
| C01,C02,C12                                                               | nba_api MIT static names, abbreviations, numeric source IDs and nba: canonical mapping                           | 30 current identities reviewed 2026-10-14, no historical aliases/rosters/results; no runtime feed        | /teams and /teams/:teamId; eight route and three UI tests, real API/browser detail/favorite; explicit season capabilities unavailable                      |
| F01,F02,F03,F04,F10,F11,F12                                               | Existing NBA profiles/seasons/per-game summaries, 2–4 distinct IDs, one season each                              | Regular season; values retain source conventions, individual missingness; no era normalization           | /lab/compare; state, component/API and real three-player URL/table/metric checks; 400 bad state, nullable outage rows, preference-only exports             |
| H01,H03,H06,H07,H10                                                       | Same bounded selected cohort plus raw shooting inputs where needed                                               | Selected 2–4 only; default minGames 10 custom rule, no official league cohort; null unsupported metrics  | /lab/analytics and /api/analytics/cohort; pure math/API/UI, real three-player raw cohort, weights changed results, saved URL/reload and phone table parity |
| L01,L03,L05,L07,L08,L09                                                   | Versioned bounded local preference JSON and safe internal URLs                                                   | Local device/session, 100 bookmarks AND 100k characters, no accounts/telemetry                           | /my-nba and save controls; corruption/quota/prototype/import/export/reset tests; real two-player/team/analysis favorites, reload and invalid/valid imports |
| A02–A08,D,E,C03–C11,G,I,J,K01/K05/K06/K07 (except stated partial C items) | Schedule/boxscore/roster/league population/shot/lineup/rights-cleared archive absent                             | Broader NBA/ESPN feed rights not cleared; hosting connectivity not tested                                | Capability messaging only. No fake scores, clocks, coordinates, ranks or lineup ratings; no placeholder route pretending success                           |

Career milestones/peak seasons and multi-player career trends remain deferred
engineering within existing-source potential. Playoff/birth-date coverage needs
separate field validation and models. No cross-provider name-only identity join;
no ESPN ID is passed to an NBA profile. Statistics CSV/export and bulk archive
redistribution remain gated; local preference export contains URLs, not NBA data.

Deferred K02/K03/K04/K08/K09, B09/B11/B12, F05/F06/F07/F08, H08/I04 and L02/L10 are engineering/field-validation follow-ups; do not call them proved inaccessible merely because they are not implemented.

## Resumed supported career scope

B09/F05/F07/H08 and individual historical profile navigation I04 now have verified reported-row implementations from existing playercareerstats Totals. B10 timeline and K03 milestones remain partial pending richer team history and recent records. No complete-career, transfer-date, verified experience/age, league-population or official peak claim. Coverage and null propagation are rendered. Broad league/game feed prerequisites remain separately gated.

## Raw-game and postseason checkpoint (2026-10-14)

Individual-player raw game analysis and postseason now supported through the already accepted playergamelog/playercareerstats endpoint families. B01/B04/B11/F08/K02/K09 have verified scoped slices; B08 remains observed-season records rather than complete-career records. K08 is a partial selected-player query/evidence tool rather than league discovery. Broader scoreboards/rosters/standings/shot/lineup source gates remain independent.

## CC0 history and qualification checkpoint (2026-10-14)

I01 season navigation is verified via CC0 facts. I02/I03 season summary/team-filter archives remain partial champion-only slices; other historical statistical/draft/award goals remain separate. Historical bookmarks work (L06 partial pending exact game save). Partial recent/future winners and modern franchise labels are deliberately exposed. No all-league statistical database built.

History inventory precision: I01 navigator is delivered; I05 year/decade filters, I08 championship facts and I11 fact-coverage views are partial. I02 statistical leaders, I03 statistical record book, I09 record progression and I10 era normalization are not delivered by the champion source. Those gates remain unavailable.

## Usage-limit resume verification (2026-10-14)

B10 reported team stints and B12 sourced-DOB age curves verified; no draft-age estimate or exact transfer-date reconstruction. L02 recent research history explicitly opt-in, off by default, device-only20 URLs, corrupt consent fails closed.

## Licensed historical tables (2026-10-14)

Wikipedia/CC BY-SA4.0 unlocks historical games/date/team filtering, actual game IDs, finals, quarter/OT scores, source venue/time labels, game leader labels, historical East/West standings and published category winners. One2023-24 season/2024 playoffs only. Team summaries use recorded games and separately labeled regular standings. Full player/team shooting box scores, regular-season schedules, rosters, current feed, leader qualification population, shot coordinates and possession data remain unavailable. See attribution notice and live acceptance.

Historical team dataset:30/30 source-listed rosters and regular-result tables structurally verified;82 finals each.29 explicitly scoped regular participant tables (639 source rows before identity/trade deduplication); Chicago18 unspecified-scope rows are separate. Season roster snapshots may omit departed participants; raw totals available in selected table layouts, shooting attempt denominators absent. Exact-ID enrichment tested on Lakers/Celtics; full production-host verification still absent. No fixtures or extrapolated records.

Shooting-count page expands B01/H02 using already sourced raw totals. G remains DATA_BLOCKED for authentic shot-event coordinates/zones/maps; aggregate shot types are not geographic zones and are not promoted as a completed G vertical.

Recorded historical source now supports pageable qualified cohort rankings, numeric metric selection, declared-scope filters, bounded licensed CSV, source-cohort midrank percentiles and2023–24 source-agreed game extrema. Unknown Chicago statistical scope, missing identifiers, unavailable attempts and unsupported trade values are excluded explicitly. Current/live league data, complete official qualification/population and broad all-time archives remain incomplete.
