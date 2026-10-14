# NBA 3.0 feature inventory and backlog

The 134-item Codex ledger (`docs/expansion/FEATURE_LEDGER.md`) is the historical baseline. This
inventory compares it with what actually ships on this branch and records the 3.0 backlog. A
feature counts as complete only with a real user experience, correct data, interactions, empty
and error states, tests and a visual check.

## Data reality that shapes priorities

| Source                                | Access here            | Coverage                                                         |
| ------------------------------------- | ---------------------- | ---------------------------------------------------------------- |
| Recorded 2023-24 snapshot (committed) | Always                 | 30 teams × 82 schedule rows, 1219 agreed finals, 639 player rows |
| 2024 playoff snapshot (Wikipedia)     | Network, cached 24 h   | All 82 playoff finals with quarters and category leaders         |
| 2018 shot archive (committed, CC0)    | Always                 | 13,470 attempts, 80 games, partial playoffs                      |
| 2017-18 lineup study (committed)      | Always                 | Researcher-derived five-man units, time and plus-minus           |
| NBA Stats (on request)                | Timed out on this host | Player profiles, game logs, careers; fixture demo mode otherwise |
| Wikidata / Wikipedia history          | Network                | Champions, awards, 2023 draft                                    |

## Inventory (3.0 view)

**Fully implemented and verified (2.0):** player hub rooms, rolling form and splits, game
research, career curves, comparison lab, Shot Studio (dots/density/zones, two-player, export),
team directory and hubs, playoff game pages, published standings/leaders, recorded rankings,
leaders, records, progression, calendar, awards, draft, lineup study, discovery, analytics lab,
percentile profiles, My NBA bookmarks/presets/import-export, global search.

**Implemented but shallow → deepened in 3.0:**

- Team hubs: identity plus an optional Wikipedia panel → **Team season intelligence** (Stage 1).
- Standings: a final table only → **Standings race** replay (Stage 1).
- Playoff games: per-date list only → **Bracket and series explorer** (Stage 2).

**Missing but feasible with existing data (backlog, in priority order):**

1. Shot Studio: clickable zones linked to the table, shot-distance histogram, zone comparison
   strip, local saved workspaces.
2. Recorded player research: a player-season card for the 639 recorded rows with
   cohort percentiles and transparent similar players.
3. My NBA: named collections, notes on saved items, duplicate/rename, search.
4. Command search: index teams, the new rooms and tools with keywords.
5. Season research dashboard for 2023-24 tying race, leaders, bracket and records together.
6. Formula lab / glossary page showing every derived metric's definition and inputs.

**Blocked (unchanged, documented in the Codex ledger):** live/current scoreboards, play-by-play,
possessions and ratings, on/off, era adjustment, league-wide shot baselines, injury data.

**Not worth implementing:** generic "player of the night" or quality scores; any bracket seeding
not present in the source.
