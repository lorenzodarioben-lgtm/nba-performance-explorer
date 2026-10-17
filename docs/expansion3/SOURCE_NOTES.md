# NBA 3.0 data-source notes

The full source audit remains `docs/expansion/FREE_DATA_SOURCE_AUDIT.md`. This file records only
what the 3.0 session checked or started using. No new external source was integrated; every 3.0
feature uses data already committed or already fetched under its existing licence.

| Source                             | Use in 3.0                                          | Licence / attribution                   | Status                     |
| ---------------------------------- | --------------------------------------------------- | --------------------------------------- | -------------------------- |
| Recorded 2023-24 team pages        | Team seasons, race, duel, player room, season hub   | CC BY-SA 4.0, revisions linked per page | Committed snapshot, in use |
| "2024 NBA playoffs" page           | Bracket, series context; seeds from series headings | CC BY-SA 4.0, revision linked           | Fetched and cached, in use |
| "2024 NBA play-in tournament" page | Considered for play-in games                        | —                                       | Redirect only; not usable  |
| 2018 playoff shot archive (Kaggle) | Distance profiles, zone strip                       | CC0                                     | Committed, in use          |
| NBA Stats                          | Unchanged provider                                  | Existing terms                          | Timed out from dev machine |

## 2022-23 season audit (session two) — not ingested

Run: `npx tsx backend/src/scripts/audit-recorded-season.ts --season 2022-23` (opt-in, serial,
cached, no writes). It selects regular-season rows only by a well-formed `00222…` NBA game ID and
requires, per team, 82 rows, 82 unique IDs, game numbers 1–82 in order, a running W–L matching
every row and no malformed recap links.

| Season  | Clean team pages | IDs listed by both teams / distinct IDs |
| ------- | ---------------- | --------------------------------------- |
| 2022-23 | 10 / 30          | 1119 / 1214                             |
| 2023-24 | 24 / 30          | 1228 / 1230                             |

The 2022-23 pages carry copy-paste duplicate recap IDs, preseason games inside the
regular-season log (Boston), malformed links (`022200072`; Milwaukee has 48), missing rows and
running records that disagree with results. Repairing them would mean guessing which row is
wrong, and a season with roughly 9% of games unpaired beside the complete 2023-24 archive would
mislead comparisons. **Decision: not ingested.** `RecordedSeasonSchema` stays `['2023-24']`, so
no API accepts a season it cannot serve.

Kept as infrastructure: the season-parametrized team-page parser (`mapTeamArchive(…, season)`),
recognition of the newer `<div class="mw-heading">` heading markup (current 2023-24 pages still
parse 30/30 with the strict mapper), `--season` on the snapshot builder, season-aware client
titles, game-ID patterns for both prefixes and a dataset check that every game ID matches its
season. A viable later route is a reconciliation that pairs games by date, both teams and mirrored
score instead of by source ID; it needs its own integrity review before use.

## Candidate for a later, separately reviewed expansion

A second recorded season (for example 2022-23 team pages) would multiply the value of every 3.0
team feature. It is feasible with the existing snapshot builder
(`backend/src/scripts/build-recorded-snapshot.ts`) but needs: `ArchiveSeasonSchema` widened
from the `'2023-24'` literal across contracts, routes and UI; the conference facts for that
season from a revisioned source; the same pair-reconciliation and quarantine audit; and
season-aware URLs. It was not started, to keep this branch's data claims unchanged.
