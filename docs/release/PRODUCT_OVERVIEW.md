# NBA Performance Explorer 3.0 — product overview

## What it is

NBA Performance Explorer is a basketball research site: a place to ask a specific question of
real NBA records and see exactly how the answer was computed. It pairs a broadcast-style
"Arena & Film Room" interface with research tools that always state their cohort, their source
and what the data cannot say.

It is a historical research platform, not a live scores app. Its datasets are:

- **Recorded 2023–24 season:** all 30 Wikipedia team pages (CC BY-SA 4.0), committed with the app
  and reconciled game by game: 1,219 finals both teams agree on, 11 quarantined, 639 regular-season
  player rows with Wikidata identifiers (CC0).
- **2024 playoffs:** all 82 games and 15 series from the "2024 NBA playoffs" article, with period
  scores and published game leaders; a structured snapshot is committed so it works offline.
- **2018 playoff shot archive:** 13,470 field-goal attempts with coordinates (Kaggle, CC0), partial
  playoffs.
- **NBA.com Stats on request** for player profiles, game logs and careers, when NBA.com is
  reachable from the host. It is never imitated: when unavailable the page says so.

## Who it is for

Fans who want more than box scores, analysts who want reproducible comparisons, and anyone
presenting a basketball argument with evidence they can link to.

## The most impressive parts

- **Playoff Series Film Room.** Any 2024 series, game by game: a keyboard-navigable tape of
  results, the series score as it stood, a line score and running margin for every game, period
  bars, and series intelligence (closest game, widest margin, comebacks after three quarters),
  all derived only from final and period scores.
- **Statistical Story Builder.** Users write research stories in My NBA: their own text between
  linked analyses that re-read the live tools (film room, comparison, similarity, workbench, Shot
  Studio, team seasons). Stories print to PDF, export as validated JSON and share as links.
- **Research Workbench.** Rank, distribute or relate any recorded player or team metric, with the
  cohort and every exclusion stated, quartiles, a fit line, and who sits furthest from it.
- **Comparison Studio and Similarity Finder.** Two to four players on one standardised gap board
  with plain-language statements; nearest seasons on any 2–9 measures the reader picks.
- **Shot Studio.** Dots, density, efficiency (points per attempt) and source zones on a true court
  projection, with drag-to-select court regions, two-player comparison and exports.
- **Team season intelligence and the standings race.** 82-game ribbons, splits, streaks and the
  whole 2023–24 race replayed by date, games behind or ladder rank.

## Technical architecture

- **Monorepo (npm workspaces):** React 19 + Vite frontend, Express 5 backend, and a shared
  `contracts` package of strict Zod schemas used by both sides, so every API response is
  validated at the boundary in both directions.
- **One service in production:** the Express server serves the API and the built frontend from
  one origin on Render, with an SPA fallback for deep links.
- **Data pipeline:** opt-in builder scripts fetch fixed source pages serially, run the same strict
  parsers as runtime, refuse incomplete data, and write committed snapshots. Runtime never
  scrapes beyond those fixed pages, and falls back to the committed snapshot with a visible
  notice.
- **Local-only personal data:** saved research, collections and stories live in the browser,
  validated on every read and write, size-bounded, with versioned JSON import and export.
- **Quality gates:** formatting, lint, a Windows/Linux module-case check, TypeScript, about 900
  unit and API tests, a production build, and a Playwright suite (smoke and axe accessibility)
  across desktop and mobile.

## Statistical integrity

- Every number states its cohort and denominator; exclusions are counted, not hidden.
- Percentiles, z-scores, quartiles, correlation and distances use documented definitions, listed
  with worked examples in the Formula Lab.
- Nothing is invented: no estimated totals from rounded averages, no play-by-play inferred from
  quarter scores, no guessed player identities (a name links only on an exact match).
- Historical, partial and fixture data are labelled where they appear; nothing claims to be live.

## Design philosophy

The Arena & Film Room system (near-black film, cinematic red, Saira Condensed, Barlow and
JetBrains Mono) treats each tool like a broadcast segment: a slate names the question, tapes name
the source, and exact tables sit under every chart. Motion is purposeful and respects reduced
motion; every interaction has a keyboard path, and charts have table alternatives.

## Data limitations

No current or live NBA data, play-by-play, possessions, on/off, injuries or league-wide shot
baselines; one fully recorded season (2022–23 failed the integrity audit and was not added); the
2018 shot archive covers part of one postseason. NBA.com player pages depend on NBA.com being
reachable from the host.

## Why it demonstrates full-stack engineering

It combines source auditing and resilient data ingestion, a contract-first API, careful
statistics with tests that hand-check the arithmetic, accessible interactive visualisation, a
coherent design system, local-first persistence with safe import/export, and a reproducible
release process, across more than 180 commits of documented, verified work.
