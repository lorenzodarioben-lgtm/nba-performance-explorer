# Feature data matrix

| IDs                                      | Required inputs                                                                    | Available source / scope                                              | Degradation / tests / owner                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| A01, A09, A10                            | Routes, capabilities, explicit source labels                                       | Local portal + existing player search                                 | No fake live badge; explorer tests planned                                |
| B02–B08                                  | Unique dated games, location, W/L, PTS/REB/AST/MIN                                 | Existing PlayerProvider, regular season only; coverage may be partial | No attempts/defense per-game fields; insights core/route/UI tests planned |
| B10                                      | Season/team records                                                                | Existing career seasons; aggregate seasons may omit team              | Do not infer transfer dates; explicit multiple-teams label                |
| F01–F04, F10–F12                         | 2–4 distinct NBA IDs, per-player season stats                                      | Existing PlayerProvider and public contracts                          | Missing season stays missing; comparison state/API/UI tests planned       |
| H01, H10, H11                            | Definitions, supported fields, provenance                                          | Local definitions + existing provider                                 | TS/eFG/pace unsupported without attempts/possessions                      |
| L01, L03–L09                             | Validated local bookmarks and safe internal URLs                                   | Local storage only; no NBA source dependency                          | Corrupt/blocked storage, invalid import and size-limit tests planned      |
| A02–A08, C03–C12, D, E, G, I, J02–J07, K | Schedules, rosters, boxscores, league populations, shots, historical/lineup inputs | New rights-cleared integration absent                                 | Explicit capability unavailable; no empty-array completion claims         |

All external player identifiers remain NBA person IDs. No ESPN-to-NBA name-only join.
Last reviewed 2026-10-14. Production-host access to new capabilities is unverified.
