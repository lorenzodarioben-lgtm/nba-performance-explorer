# NBA Performance Explorer 3.3 - product overview

NBA Performance Explorer is a basketball analytics and historical research application.
Its Arena & Film Room interface connects each chart and table to its cohort, source and
coverage limits. This branch is a design-finalized release candidate, not a claim that the
existing public service already runs 3.3.

## Capabilities

- Player profiles, season statistics, career analysis, game logs, shooting and research rooms.
- Player/global search and navigation across teams, seasons, games, comparisons and tools.
- Team directory, franchise and season views, league standings/leaders, records and eras.
- Historical season navigation, source-labelled champions, awards, drafts and source index.
- Scoreboard schedule, game pages, box scores and play-by-play where NBA.com supplies them.
- Player comparisons, comparison studio, career curves, similarity and team comparison.
- Workbench, Shot Studio, lineups, formula tools, percentile and statistical research.
- Playoff film room, saved research, collections and statistical stories with local import/export.
- Approved imagery and team marks, responsive navigation, liquid VS interaction, keyboard
  controls, chart table alternatives and system/in-app reduced motion.

## Data and persistence

The committed NBA.com league archive covers 1983-84 through 2025-26. Eleven seasons are
team-only because player/team box lines fail reconciliation. Separate revisioned Wikipedia
snapshots cover the reconciled 2023-24 season and 2024 playoffs. The CC0 2018 playoff shot
archive is partial (80 of 82 games). Wikidata supplies historical facts/identity links.
NBA.com Stats and CDN provide on-request player research, current schedules and other live
features; availability is host-dependent. Historical, live, partial and explicit demo-fixture
sources stay distinct. Production requires an explicit provider and refuses fixtures unless
an explicit demonstration override is enabled; the release configuration disables it.

Saved work lives in the browser, with validation and size limits. There are no accounts or
cross-device synchronization. Source availability, historical coverage and successful live
retrieval do not establish permission to publish data or imagery.

## Integrity and accessibility

No guessed identities, fabricated scores, inferred play-by-play or silent fixture substitution.
Tables expose chart data; denominators and excluded rows are stated. Shared contracts validate
API boundaries. Browser storage/imports are validated and bounded. Exports escape text and
neutralize CSV formulas. Motion respects system and in-app preferences, and key research flows
have keyboard paths.

## Release boundary

The approved visual baseline is `8e2b38b6b3c5569c2700cd041bcb9b6d0e3818ce`.
This audit preserves the application design and behavior. See [release readiness](RELEASE_READINESS.md)
for executed checks, [release notes](RELEASE_NOTES_3.3.md), [publication rights](RIGHTS_REVIEW_3.3.md)
and [deployment/rollback steps](DEPLOYMENT_RUNBOOK.md). Technical readiness and publication
approval are separate decisions.
