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

**Delivered in 3.0 (beyond the above):** Shot Studio distance profiles, clickable zones, zone
comparison strip and saved views; the player hub "2023–24" room with cohort percentiles and
transparent similar seasons; search over archive players, team seasons and tool keywords; the My
NBA research board with notes; the 2023-24 season research hub.

**Delivered in session two:** Research Workbench (rank, distribution with quartiles, relationship
with fit line and residual departures; players and teams); Comparison Studio (2–4 players, gap
board on z/percentile/raw scales, plain statements, exact values); Shot Studio efficiency by
points per attempt and court-region selection; My NBA collections; Similarity Finder on
reader-chosen measures. The session-one backlog (team duel, series context, Formula lab, race
games-behind view) shipped in session one.

**Delivered in session three (finalization):** Playoff Series Film Room, Statistical Story
Builder, playoff series and game search, published-leader player links, comparison CSV/SVG
exports, the guided tour, an offline-capable committed playoff snapshot and the Windows
presentation scripts. The authoritative requirement status is now
[`docs/release/FINAL_FEATURE_MATRIX.md`](../release/FINAL_FEATURE_MATRIX.md).

**Remaining backlog (after session three):** reader-weighted similarity and similar team
seasons; a field-by-season coverage explorer; Shot Studio two-region comparison. Items 1–2 of the
list below shipped in session three.

**Missing but feasible with existing data (backlog, in priority order):**

1. Playoff series film room from the 2024 playoff snapshot (margins, quarter flow, leaders).
2. Statistical story builder composing saved Workbench, Studio and Similarity results (local).
3. Reader-weighted similarity and similar team seasons.
4. Shot Studio: compare two regions, or one region across two players, as a single readout.

**Blocked by data quality:** a second recorded season. 2022-23 team pages fail the strict parser
on 20 of 30 teams (audit in `SOURCE_NOTES.md`); nothing is ingested until they pass.

**Blocked (unchanged, documented in the Codex ledger):** live/current scoreboards, play-by-play,
possessions and ratings, on/off, era adjustment, league-wide shot baselines, injury data.

**Not worth implementing:** generic "player of the night" or quality scores; any bracket seeding
not present in the source.
