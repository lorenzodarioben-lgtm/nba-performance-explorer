# Project Specification — NBA Performance Explorer

> Status: Initial development (project foundation implemented; product features pending).
> This document is a source of truth. Contributors must read it before making changes.

## Product statement

NBA Performance Explorer is a responsive web application that lets users search for
NBA players, examine player performance across seasons, view calculated insights and
interactive visualisations, and compare two players side by side. The application turns
raw season and game data into readable statistics, trends, and shareable comparisons.

This is a portfolio project. Its purpose is to demonstrate clean architecture, a clear
separation between data sources and the user interface, testable code, and a maintainable
development workflow — not to ship a commercial product.

## Target user

The primary user is a basketball fan or analyst who wants to look up a player and quickly
understand how they performed in a given season, see how their numbers trend over time,
and compare them against another player. The user is comfortable with a typical web app
but should not need any specialist knowledge to read the screens.

A secondary audience is the project's own reviewers (for example, hiring managers or
collaborators evaluating the portfolio) who will read the code and documentation to judge
engineering quality.

## Core user journey

The central journey the product is built around is:

1. Search for a player.
2. Open the player profile.
3. Select a season.
4. View key statistics, trends, and a game log.
5. Select another player.
6. Compare both players.
7. Share the resulting URL.

Every MVP feature exists to support this journey. Shareability is a first-class concern:
the selected player(s), season, and comparison state must be expressible in the URL so a
user can copy the link and another person sees the same view.

## MVP

The minimum viable product is the set of capabilities required to complete the core user
journey end to end with mock or fixture data:

- Player search.
- Player profile.
- Season selector.
- Key statistic cards.
- Interactive performance chart.
- Game log.
- Two-player comparison.
- Calculated insights (statistics derived from the underlying data).
- Shareable URLs (player, season, and comparison state encoded in the URL).
- Responsive design (works on small and large viewports).
- Accessible loading, empty, and error states.
- Automated tests.
- CI validation.
- Public deployment (later — not required for the MVP to be considered functionally complete locally).

## Non-goals

The following are explicitly out of scope for the MVP. They are not "later" items unless
stated; they are deliberate exclusions to keep the project focused:

- Authentication.
- User profiles.
- Social features.
- Fantasy-team management.
- Betting recommendations.
- Machine-learning predictions.
- Live scores.
- WebSockets.
- Native mobile application.
- Kubernetes.
- Microservices.

## Definition of done

A feature or task is "done" only when all of the following hold:

- The behaviour described in the relevant task file is implemented and matches this spec.
- TypeScript strict mode is enabled and the code type-checks with no errors.
- No `any` is used unless it is explicitly documented and justified.
- No API credentials or secrets appear anywhere in frontend code or the committed repository.
- Linting passes.
- Formatting is applied.
- Unit tests pass, and meaningful tests exist for the new behaviour.
- The production build succeeds.
- Loading, empty, and error states are handled where the feature involves data.
- The work is accessible and responsive where it touches the UI.
- `docs/PROJECT_STATE.md` is updated to reflect the new state.
- Any significant decision made during the work is recorded in `docs/DECISIONS.md`.
- The complete git diff has been reviewed.
- Nothing is claimed to pass unless it was actually run and verified.
