# Shot 2 — Arena & Film Room redesign: verification log

Approved direction: **A — Arena & Film Room** (visual reference: the Direction A screens in the
design showcase artifact). Work branch `claude/nba-explorer-design`; engineering baseline
`b4e5f88`. The original engine history is preserved; nothing is rebased or rewritten.

Entries are appended in order. Each records what was run, the exact result and anything left
open. Test changes are re-expressions of the same assertion, never removals.

## Stage 0 — baseline (before any visual change)

- Branch `claude/nba-explorer-design` at `b4e5f88`, clean tree, 105 commits of history.
- `npm run validate`: **PASS** in 2m11s. Frontend 324 tests / 47 files, backend 413 tests /
  41 files (737 total). Format, lint, typecheck and both builds pass.
- Production frontend build: main chunk `index-*.js` **646.12 kB (189.08 kB gzip)**, shared
  `dist-*.js` 159.19 kB (46.10 kB gzip), CSS 44.97 kB (8.84 kB gzip). Largest route chunks:
  TeamsPage 18.40 kB, ShotArchivePage 15.54 kB. Existing >500 kB chunk warning present.
- Browser smoke harness (new, `npm run e2e`, Playwright 1.55.0, local Chromium 1194, reduced
  motion): 39 route examples × desktop 1440×900 and phone 390×844 — **78/78 pass** (one `h1`,
  one `main`, one banner, one footer, no horizontal overflow, no uncaught errors). `/players`,
  `/labs` and the not-found example currently fall through to the home page.
- Accessibility scan (axe-core 4.13 via `@axe-core/playwright`, desktop): **39/39 routes fail
  on one serious `color-contrast` node** (low-contrast masthead/footer micro-labels shared by
  every route); `aria-hidden-focus` on 2 routes. Target for the redesign: zero serious or
  critical violations.

### Dependencies added in Stage 0

| Package                | Version | Licence    | Scope          | Reason                                                              |
| ---------------------- | ------- | ---------- | -------------- | ------------------------------------------------------------------- |
| `motion`               | 13.4.6  | MIT        | frontend, prod | Motion system: layout/FLIP, presence, springs, scroll-linked values |
| `@playwright/test`     | 1.55.0  | Apache-2.0 | root, dev only | Browser smoke, interaction and visual checks                        |
| `@axe-core/playwright` | 4.13.0  | MPL-2.0    | root, dev only | Automated accessibility scans                                       |

No paid service, account or API key is introduced. Motion was chosen over GSAP for its MIT
licence and React-native layout/presence primitives; no second animation library is used.

## Stage 1 — design and motion foundations

- Added: Barlow UI face (self-hosted, OFL notice), design tokens (`src/design/system.css`),
  chart surfaces (`src/design/charts.css`), motion tokens and registers
  (`src/motion/tokens.ts`), motion preference provider (system / reduced / full, stored under
  `npe.motion-preference.v1`, mirrored to `html[data-motion]` for CSS), choreography
  primitives (kinetic headline, scroll reveals, stagger, value flip, pointer depth, route
  entrance), UI primitives (source tape, slate, icons, toast, segmented control, data states,
  demonstration band) and the chart kit (scales, court geometry + `Court`, `LineChart` with
  gap-honest segments, crosshair, keyboard reading and brushing, `BarChart`, `RankBars`,
  legends with shape + dash encoding, tooltip).
- Test environment: IntersectionObserver mock reports elements in view, `matchMedia` fallback,
  `MotionGlobalConfig.skipAnimations = true` so animated content renders in its final state.
- New unit tests: `src/charts/chart-kit.test.ts` (7) — scale mapping, nice ticks, gap
  splitting, nearest-point lookup, corner-three break point, coordinate projection, court
  line kinds.
- Frontend tests: **331 pass / 48 files** (324 original + 7 new). Typecheck, lint (0 errors;
  react-refresh warnings only), Prettier check pass.
- Build: main chunk **777.18 kB (232.75 kB gzip)** — +131 kB / +43.7 kB gzip for Motion while
  Recharts is still eagerly loaded. Recharts removal (Stage 3) is expected to offset this.

## Stage 2 — global shell and Film Room frame

- Masthead rebuilt (sticky, scroll-firmed backdrop): six sections (Players, Teams, Games,
  Seasons, Compare, Labs) with a sliding red active bar (shared layout), My NBA, a search
  trigger (`/`, Ctrl/Cmd+K) and the phone Menu dialog (clip-path wipe, staggered sections,
  same focus trap / Escape / focus-restore behaviour). Section sub-navigation strip for
  Games, Seasons, Compare and Labs (`src/shell/sections.ts` maps all 35 routes; no URL
  changed). Removed the dead `#explore` / `#trends` anchors.
- Search overlay (`src/shell/SearchOverlay.tsx`, lazy, preloaded on idle): one combobox over
  players (existing player search API), teams (directory API) and every section/tool.
- Footer: sections, sources, accurate notice ("Statistics sourced from NBA.com on request,
  plus labelled historical archives … Nothing on this site is a live feed"). "Live NBA.com
  data" removed. `index.html` title/description no longer claim live data; Barlow preloaded.
- `ResearchShell` is now the Film Room frame (breadcrumbs, kinetic page title, `.fr` scope);
  the 27-link research nav is replaced by the masthead. `SourceNote` shows its source tape and
  keeps every string; fixture provenance switches on the global demonstration band.
  `QueryFeedback` uses the loading line / error notice with the same text and roles.
- New routes: `/players` (search, photo board, hub rooms), `/labs` (research benches with
  tapes), `*` → "Off the court." 404 (previously fell through to the home page). Route
  fallbacks share one loading frame placed under the masthead. Skip link, route entrance
  keyed by place (player hub routes share one key), scroll-to-top on navigation.
- Test re-expressions (no assertion removed):
  - `ExplorerPage.test.tsx` "keeps navigation available during source outage": the "Original
    home" link lived in the removed research nav; the test now asserts the masthead home link
    (`NBA Performance Explorer` → `/`) is present during the outage.
  - `PlayerCareerTrends.test.tsx`: the chart wrapper is found by `[data-chart="career-trends"]
[aria-hidden="true"]` instead of "the first aria-hidden element on the page" (the new
    masthead has decorative aria-hidden layers). Same svg / series-name / dash assertions.
- New tests: `src/shell/shell.test.tsx` (7) — route→section map, active section + subnav,
  slash-key search to a team hub, Escape, 404, both landings.
- Results: frontend **338/338** (49 files); format, lint (0 errors), typecheck pass. Browser
  smoke **78/78** (desktop + phone). axe (desktop): **35/39 routes clean** (baseline 0/39).
  Remaining serious nodes are inside pages still to be rebuilt: Recharts `aria-hidden-focus`
  and an 11px `#b91c1c` label on `/players/:id` and `/compare` (Stages 3, 5), a `#1d4ed8`
  series label on `/lab/profiles` (Stage 5). The 404 failure was a spec issue (reduced motion
  not emulated during the scan); both specs now call `emulateMedia({ reducedMotion })`.
- Build: main chunk **755.21 kB (220.72 kB gzip)**, CSS 83.25 kB (16.72 kB gzip).

## Stage 3 — player hub

- `/players/:playerId` is now a layout route (`PlayerHubLayout`) with the same URLs as
  before: Overview (index), Form (`/insights`), Game research (`/games`), Career
  (`/career`), Shooting (`/shooting`). A sticky hub bar keeps the tabs mounted (sliding active
  marker), carries the current `season` into season-scoped rooms, adds a "Shot map · 2018 PO"
  link only when the player is in the archived shot directory, and shows the score bug
  (jersey/initials, name, team) once the overview hero leaves view or on any deeper room.
  The hub never requests the profile itself: rooms report the player's name from their own
  data (`useHubIdentity`) and a cached profile is read without fetching.
- Overview: Arena hero (photo with pointer depth + scroll parallax and a clip reveal, or a
  photo-free court composition; outlined jersey/initials in depth; kinetic name — h1 still
  reads exactly the player's name; bio as a broadcast strip with every original label);
  Compare + Save actions. Season statistics: slate + tape, flip transitions between loaded
  seasons (no intermediate values; loading never shows stale figures), percentage meters.
  Game log: points-by-game bars (win/loss tone, keyboard readable) linked to the table.
  Career trends: in-house `LineChart` replaces Recharts here, on a calendar axis where
  unreported seasons are gaps (footnote counts them).
- Form: summary scoreboards (all matching / last N), rolling-form line chart, slates.
  Game research: rolling TS%/eFG% chart and ledger bars (shown only when raw data exists).
  Career: career-arc chart with gaps, qualified-peak scoreboard. Shooting: makes-inside-
  attempts bars per shot type; copy defects fixed ("from 1 to 1000", "exceed 1",
  "conventional 0.44").
- Shared: `Notice` puts its role on the element holding the message; `SaveResearchButton`
  gains a star confirmation and a "Saved to My NBA" toast (the inline status text is kept).
- Test re-expressions (no assertion removed):
  - `PlayerInsightsPage.test.tsx`: "Original player profile" link → the hub's Overview tab
    (same href `/players/2544`).
  - `PlayerCareerTrends.test.tsx`: the chart surface is `[data-chart="career-trends"]` and
    its SVG is `aria-hidden` (the table is the equivalent); same series-name and dash
    assertions.
  - `CareerResearchPage.test.tsx` (career comparison): the "no fabricated line" path counts
    are scoped to `svg[data-chart="career-curves"]` instead of every SVG in `main` (the Save
    button now has a star icon).
  - Test server default: `/api/shots/directory` answers 503 unless a test overrides it (the
    hub asks for the directory to decide on the Shot map link).
- New tests: `features/player-hub/seasons.test.ts` (2) — calendar gap filling and season
  display forms.
- Results: frontend **340/340** (50 files); lint 0 errors; typecheck, Prettier pass. Browser
  smoke 78/78; axe desktop: `/players/:id` now clean. Remaining serious nodes: `/compare`
  (Recharts, Stage 5), `/lab/profiles` (Stage 5); home legacy label contrast fixed.
- Build: main chunk 776.15 kB (229.36 kB gzip) — Recharts is still eagerly loaded by the
  comparison page until Stage 5.

## Stage 4 — Shot Studio

- `/lab/shots` rebuilt on the shared `Court` (official geometry, basket at the bottom as in the
  approved prototype, cropped at half court). Views: Dots (exact table page; make = filled
  chalk circle, miss = red ×), Density (all filtered located events, 5 ft cells, one amber
  scale shared by every panel) and the new Zones view (each original source zone shaded by
  its share of the panel's attempts, labelled with FG%; outlines never reassign attempts).
  `view` stays a UI-only parameter stripped before the API call; `zones` is a new value of it.
- Attempts beyond half court are not moved: they stay in every table and are counted at the
  far edge of the drawn court. A panel with no events on the current table page says so.
- Linked reading: hovering a shot highlights its table row and fills the broadcast readout;
  hovering or focusing a row highlights its mark.
- Filter rail (sticky on desktop, collapsed `details` on phones); Segmented view switch;
  per-panel stat strip.
- **Export fix**: each court registers its SVG under its group key; "Export … plot SVG" takes
  that panel's own SVG (previously `querySelectorAll('svg')[index]`, which picks the wrong
  element as soon as any icon precedes it). Court lines carry presentation attributes so an
  exported SVG keeps them without page CSS. Export copy spacing fixed ("partial 2018",
  "event page 1, 2 rows", "5 ft cells").
- Copy fixes: "Coverage ends June 3", "Separate 2023–24", "recorded 2017-18", "makes-only
  yields 100%", "50×94 feet", "5.25 feet", "divided by 10", "5×5 foot", "page 1", attribution
  spacing.
- `research.module.css` now compiles into the `components` cascade layer (it was unlayered and
  silently beat every layered design rule).
- Test re-expressions: mark colours → `[data-result][data-raw-x][data-raw-y]` (raw recorded
  coordinates asserted); density `rect[fill="#1d4ed8"]` → `[data-cell]` (same count of 2);
  "June3" → "June 3" with the copy fix.
- New test: "exports each panel from its own court, not by position on the page" — two
  panels, export the second, assert the SVG contains only that player's shot, carries the
  label and reopens as valid XML.
- Results: frontend **341/341**; lint 0 errors; typecheck, Prettier pass. Browser check on the
  genuine archive (`/lab/shots?players=201939,201935`, dots/density/zones, phone).

## Stage 5 — comparison suite

- Head to head (`/compare`): Arena header (kinetic "Compare players"), VS mark that lands
  once, design-system states, season control and module titles; series colours moved to the
  validated categorical pair. The career arc now uses the in-house `LineChart` on a calendar
  axis (unreported seasons are gaps; keyboard reading with crosshair + tooltip verified in the
  browser).
- **Recharts removed** (`npm uninstall recharts -w frontend`): both of its charts (profile
  career trends in Stage 3, comparison career arc here) have tested, browser-verified
  in-house equivalents. Main chunk **432.46 kB (127.53 kB gzip)** vs the Stage 0 baseline
  646.12 kB (189.08 kB gzip): −33 % even with Motion added.
- `LineChart` gains `breakBefore` (a per-index "do not connect" flag) so adjacent categories can
  still break when the underlying seasons are years apart.
- Career curves (`/lab/careers`): in-house chart on calendar / age / reported-number axes, up
  to four players told apart by colour, dash and marker shape; lines never connect
  non-consecutive seasons.
- Percentile profiles (`/lab/profiles`): the colour-only radar becomes percentile strips (one
  0–100 track per category; players differ by shape, lane and colour; markers appear in
  place). `data-profile` hooks kept; the low-contrast `#1d4ed8` label is gone.
- Player lab (`/lab/compare`): metric board — one small multiple per metric, players on a
  shared scale inside each panel, unavailable never drawn as zero.
- Team vs team (`/lab/teams`): typographic team plates (outlined abbreviations, W–L) and a
  reusable `MirrorBars` tale of the tape (per-row scales, solid vs hatched sides).
- Test re-expressions: career-curve "no fabricated line" now asserts that no drawn series
  segment contains a connecting `L` command (previously a count of all paths in one SVG);
  percentile-profile copy "zero polygon" → "zero-percentile marks" (plain-language, the
  never-at-zero assertion is unchanged).
- New tests: `src/charts/LineChart.test.tsx` (2) — gaps and explicit breaks are never
  bridged; every point can be read from the keyboard, including "not recorded".
- Results: frontend **343/343** (51 files); lint 0 errors; typecheck pass.
