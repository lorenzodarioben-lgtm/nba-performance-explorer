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

## Candidate for a later, separately reviewed expansion

A second recorded season (for example 2022-23 team pages) would multiply the value of every 3.0
team feature. It is feasible with the existing snapshot builder
(`backend/src/scripts/build-recorded-snapshot.ts`) but needs: `ArchiveSeasonSchema` widened
from the `'2023-24'` literal across contracts, routes and UI; the conference facts for that
season from a revisioned source; the same pair-reconciliation and quarantine audit; and
season-aware URLs. It was not started, to keep this branch's data claims unchanged.
