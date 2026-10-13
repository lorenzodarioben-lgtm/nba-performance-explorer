# Design handoff for Claude — Shot 2

The engine branch is working but incomplete. Original home/profile/compare render
sources, header/footer, global CSS, fonts/images and baseline screenshot assets
are unchanged. Only App.tsx registers additive lazy routes. Full platform design
integration is NOT ready while games, rosters, standings and league sources remain
blocked; targeted design of the verified tools below is reviewable.

| Page / route              | Functional state                          | Interactions and required data states                                                                                                                                                                                                                                                                |
| ------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| /explore                  | Working hub                               | Existing accessible player search to insights, local module nav, configured fixture/source label, available/conditional/blocked capabilities; no fake live status                                                                                                                                    |
| /players/:NBA_ID/insights | Working observed-game + raw-stat analysis | Available season selector; rolling 5/10/20 and valid custom windows; inclusive dates/opponent/home-away/W-L; ledger sort/pagination; samples, rolling/split tables, tied extrema; raw totals/TS/eFG/AST-TO/per36; source/empty/unsupported/error; save resolved season/filter URL                    |
| /lab/compare              | Working 2–4 player lab                    | Search/add/remove distinct NBA IDs; independent season picks; metric switch; raw equal-unit table and per-player missing values; share URL; save; link to analytics and original profile/insights                                                                                                    |
| /lab/analytics            | Working bounded selected-cohort lab       | Cohort edited via comparison; x/y metrics, signed weights and min games; true raw attempt requirements, matched scope; scatter with exact table, z-score formula, custom competition ranks and descriptive correlation; exclusions/tiny samples; URL and local saves. NOT league ranking/percentiles |
| /teams                    | Working sourced identity directory only   | Text search and namespaced detail links for all 30 current teams; no logos/roster season data                                                                                                                                                                                                        |
| /teams/:nba_ID            | Identity detail only                      | Source/mapping, favorite action, explicit unavailable roster/schedule/record capabilities; not a finished full team profile                                                                                                                                                                          |
| /my-nba                   | Working local-first research              | Favorites/named URLs, removal, bounded versioned JSON export/import merge, invalid/corrupt/quota/blocked storage recovery, confirmed clear; no cloud account or tracking                                                                                                                             |

Navigation journeys actually exercised locally with genuine NBA data:
explorer search → Curry insights → season/window/opponent controls;
3-player direct comparison → metric selection → analytics TS/AST-TO with negative
weight → save → My NBA reload/export; two player + team favorites → valid/invalid
imports → current team detail. Source and exact API evidence in VERIFICATION_LOG.md.
Native browser screenshots were emitted in this chat at 664x704 (insights and old
home/compare) and 390x844 (analytics table/keyboard scroll). No new screenshot
files or matched-fixture pixel-diff baselines were saved. Existing visual reference:
`docs/assets/home-desktop.png`, `home-mobile.png`, `player-profile-desktop.png`,
`career-trends-desktop.png`, `player-comparison-desktop.png`.

Contracts: packages/contracts/src. Business rules: backend/features/research.
Fixtures are prominently labeled and raw totals disabled in default local fixture
runtime; all missing inputs have honest null/unavailable states. Totals actual
retrievedAt is known, legacy timestamps/asOf unknown, all isLive false. Preserve
source attribution and cohort/sample definitions in every visual concept.

Local viewing: npm ci; npm run dev; open http://localhost:5173/explore. For genuine
raw stats, set NBA_DATA_PROVIDER=nba-stats before npm run dev. No API key/billing.
NBA access/terms conditional; Render not verified for this expansion. Refresh tabs
after replacing production builds; stale lazy chunk hashes can trigger the existing
reload boundary. See OPERATIONS.md.

Claude and the human choose visual direction, typography/layout treatments, chart
embellishment, responsive representations and masthead integration. Current plain
scoped CSS has no design system mandate. Keep controls keyboard-operable, charts
paired with exact tables, role/status states and visible focus. The original
masthead/footer are frozen and their home anchors/static live branding are not
optimized for new routes; coordinate any future change with the human.

DO NOT break contracts, alter statistics, replace missing data with illustrations,
or move core calculation/qualification/identity logic into visual components.
No unsupported scoreboard, shot map or observed-lineup mockup may appear as a
working data feature. Keep original screenshot assets and protect original visual DNA.

## Additional reviewable career tools

After the resumed 577-test checkpoint, review `/players/893/career`, `/players/201939/career?metric=pointsPer36&minGames=40`, `/lab/careers?players=201939,2544&metric=pointsPerGame&minGames=20&axis=calendar`, and the demand-loaded qualified peak picker in `/lab/compare`. Career curves and tables use the same raw records; never bridge missing years or present reported season number as verified experience. Milestones mean reported rows, not first-ever achievements. Preserve source/scope/null/sample/tie labels. Original website remains frozen; no final design readiness claim for blocked modules.

## Raw-game and postseason checkpoint (2026-10-14)

New `/players/201939/games?season=2022-23&scope=playoffs` provides raw ledger, weighted splits, threshold controls, rolling table and exact evidence; use `/players/201939/games?season=2023-24&minPoints=40` for unusual-game queries. Career pages now offer explicit scope; peak links preserve playoffs. Separate same-season regular/playoff comparison is visible below game research. Tables keyboard-scroll on mobile. Preserve scoped labels, sample counts, missing cells and coverage.

## CC0 history and qualification checkpoint (2026-10-14)

Review `/history`, `/history/1999-00`, `/history?from=1990&to=2005` and source-entity champion filters. Keep namespaced IDs, modern-franchise label warning, missing champion state, source record-backed navigation and safe external check/report links. No official championship totals. Raw-game minSample qualifier now shows eligibility and suppresses small-cohort derived cells. Original design still frozen.

## Usage-limit resume verification (2026-10-14)

Review career comparison axis=age and Luka career trade rows. Age reference is October1 of season start year, from sourced DOB; experience is reported-season count only. MyNBA recent history is off by default; only research shell pages record after consent. Original screens excluded.

## Historical routes added

Plain research shell now hosts `/games`, `/games/:gameId`, `/standings`, `/leaders` and an optional historical team panel. Keep contributor/revision/licence notices, explicit historical scope, unavailable current feed/timezone and keyboard-scrollable tables intact. Styling uses only existing scoped research module; protected original pages/header/footer/global styling stay frozen. Full-platform design readiness remains NO.

`/discover` is a plain selected-pool similarity tool. Keep sample limits, equal-axis formula, exclusions and source evidence visible; random action operates only on loaded qualifying records. Original design unchanged.

Historical team page adds a separate opt-in roster/regular-results section with scoped participant sort/search/GP controls, preserved missingness/identity links and source notices. Keep raw-vs-published basis, unknown statistical scope and neutral-site home/away semantics clear. Original pages/styles/assets remain frozen.
