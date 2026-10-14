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

## Stage 6 — league: standings, leaders, games, teams

- Standings (`/standings`): two conference ladders (rank, outlined-abbreviation team link,
  W–L, games-behind bar on one shared scale). Rows reorder with a layout (FLIP) animation
  when the sort metric changes. Cut lines (1–6 playoffs, 7–10 play-in) are drawn only on the
  source-rank order and labelled as the 2023–24 postseason format, not source data.
- Leaders (`/leaders`): board of published category winners; ties shown together in an amber
  bracket with a "Tie · n" label; nothing ranked beyond what was published.
- Games (`/games`): recorded-date strip and broadcast score cards (always "Final", OT noted,
  winner emphasised by weight only). Game page: score-bug hero (FINAL stamp, date, venue,
  archive tape), line score, and a margin-after-each-period flow labelled as calculated from
  the published period scores.
- Teams: directory wall of outlined-abbreviation plates; team hub with a decorative outlined
  abbreviation behind the title, "Live season data unavailable" demoted from a heading to a
  quiet label (text kept), and a results strip (final margin per game, wins up / losses down,
  keyboard readable) once the 2023–24 details load. The on-demand load buttons and the
  `archive=` / `details=` URLs are unchanged.
- Recorded leaders (`/leaders/recorded`): top-three podium (page 1) and in-row value bars on
  one scale; tied players share a "T-n" rank; percentiles shown. Team rankings
  (`/standings/recorded`): ranked bars with W–L, last 10, streak and home/away in each row;
  `RankBars` gains a diverging mode for signed metrics such as final margin. Calendar: score
  cards linking to recaps. Game shooting: team mirror bars.
- Copy fixes: "last 10", "defaults to 20 … and 5", "100 × (… + 0.5 × …) / …", "source-agreed
  2023–24", "defaults to {today}", "for {day}", "and {n} source-listed", "require {n}",
  "FG and 3P", "in 2023–24".
- Test re-expression: the overtime assertion is scoped to the accessible period table
  (`OT1` now also appears in the aria-hidden line score).
- Results: frontend **343/343**; lint 0 errors; typecheck pass. Browser check on the genuine
  archive: standings, leaders, games, game page, team hub with details, recorded leaders.

## Stage 7 — seasons and history

- Season index (`/history`): decade timeline of every recorded season, each cell carrying
  its champion statement (dashed when the source has none) and linking to the season page.
  Season page (`/history/:season`): giant outlined season hero with the champion statement;
  previous/next links restyled (names unchanged).
- Awards (`/history/awards`): trophy board — one card per award, every published recipient
  with the source team association; missing recipients stated, never guessed.
- Draft (`/history/draft`): draft board of numbered picks (pick, listed team, name, position,
  school), linking to the player hub only where a sourced NBA identity exists.
- Record progression (`/history/progression`): the hand-drawn SVG (low-contrast
  `#1d4ed8`, no axis, no reading) becomes the in-house `LineChart`; missing dates stay gaps.
- Copy fixes: "from {n} source rows", "Historical 2023–24 yearly awards".
- Test re-expressions: progression's `svg circle` / `svg polyline` counts (2 / 2) become the
  chart's mark count (2) and disconnected series-segment count (2) under
  `[data-chart="progression-mean"]` — the same "one mark per recorded mean, gap never
  bridged" assertion.
- Results: frontend **343/343**; lint 0 errors; typecheck pass.

## Stage 8 — labs

- Chart kit: `ScatterPlot` (nice axes with labels, nearest-point hover with crosshair and
  tooltip, keyboard reading in x order, rectangle brushing whose rectangle follows the pointer
  by direct attribute writes — no React state per frame — and commits the selection once on
  release). Non-negative measures are never padded below zero.
- Analytics lab (`/lab/analytics`): the colour-only numbered scatter becomes `ScatterPlot`
  with row-number tags; brushing highlights the matching table rows with a "n of N selected"
  status and Clear button (linked filtering in A's language).
- Group analytics (`/lab/recorded`): histograms on the keyboard-readable `BarChart`; scatter on
  `ScatterPlot` with the target player in red.
- Lineups (`/lab/lineups`): five-player unit cards (initials medallions with full aliases,
  shared-minutes bar on a page-wide scale, plus/minus per 48 diverging around zero — "Below
  min" when the unit does not qualify, never a fabricated rate).
- Hypothetical five (`/lab/groups`): the result sits inside a dashed hypothetical frame with a
  HYPOTHETICAL tape and "Never observed together · not a result".
- Copy sweep: no glued `word{expression}` text remains in feature JSX ("of 5",
  "per 48", "× 2880 /", "per 100", "minimum {n}", "publisher {n}", "Page {n}; showing {n}",
  "in {from}", "require {n}", "pool {n}", "Target {name}, GP {n}", "at most {n}",
  "version {n}", "source {key}", "file {name}").
- Circle-count tests (`AnalyticsLabPage`, `RecordedAnalyticsPage`) pass unchanged: one circle
  per point.
- Results: frontend **343/343**; lint 0 errors; typecheck pass. Browser check on the genuine
  archive: group scatter hover, lineup cards, hypothetical frame, season timeline.

## Stage 9 (part 1) — homepage and scroll-triggered motion fix

- Home (`/`): Arena hero — Wembanyama photograph with clip reveal, pointer depth and scroll
  parallax; court lines in depth; eyebrow "NBA.com player data · historical archives ·
  nothing live"; h1 = "NBA Performance Explorer" + kinetic "READ / THE GAME." (no blocking
  splash; the page is usable while the type rises). Player search and a plain-language
  service status ("Connecting to the data service…", "Data service available") replace the
  "live data" wording. The rundown: six numbered section rows with a red sweep on hover.
  "On tape now": three previews of genuine archives (Curry's 2018 playoff shots on the
  court, 2023–24 conference leaders, the last recorded playoff final) that share query keys
  with their destination pages. Head-to-head call to action. The capability marquee and
  the "Tip off" block are retired.
- **Motion fix (browser-found):** a fully clipped reveal never intersects in Chromium, and a
  zero-size mark (scale 0) has nothing to observe, so some `whileInView` animations never
  fired under full motion (screenshots taken with reduced motion hid this). Clip reveals now
  observe an unclipped wrapper; every zero-start chart mark (slate tick, bars, ladders,
  margin flow, unit bars, mirror bars, rank bars, line-chart draw, scatter and strip marks)
  animates from its container's visibility via `useSeen()`. Verified in Chromium with full
  motion: every probed mark reaches its true end state.
- Test re-expressions: the home h1 name is matched with `/NBA Performance Explorer/` (the
  heading now also carries "Read the game."); the three service-status strings follow the
  plain-language copy ("data service", never "live data"). Test server defaults: the
  shot, standings and playoff-game archives answer 503 unless a test overrides them (the home
  previews read them).
- Results: frontend **343/343**; lint 0 errors; typecheck pass. Browser: smoke **78/78**
  (desktop + phone) and axe **39/39 routes with zero serious/critical violations** (Stage 0
  baseline: 0/39).

## Stage 9 (part 2) — motion setting and "What's on tape"

- My NBA gains a **Motion** setting (System / Reduced / Full), remembered on this device.
  Toggling it first remounted page content (Reveal, Stagger, StaggerItem and RouteEntrance
  swapped between plain and motion elements); they now always render motion elements and
  change only their initial state. New test: choosing Reduced/Full updates the pressed state,
  the document's motion mode and storage.
- `/explore` becomes **What's on tape**: six source cards (NBA.com on request, 2023–24
  Wikipedia archive, Wikidata, 2018 playoff shots, 2017–18 lineup study, team identities),
  each with licence, what it covers, what it leaves out and where it is used; the service's
  capability report grouped into Available / Conditional / Blocked lanes (status by word and
  shape, never colour alone; "Open" links only for usable capabilities); a tape legend; and
  a "Not on tape" list. Pinned strings kept verbatim (demo-mode notice, `id: status` lines,
  "Find a player for insights", outage alert). Source facts were checked against
  `docs/expansion/FREE_DATA_SOURCE_AUDIT.md` and the shot contract.
- Copy correction found while checking facts: Labs said Shot Studio takes "up to four
  players"; the shot query contract allows one or two. Now "one or two players".
- Results: frontend **346/346**; explorer smoke + axe pass; Chromium at 390 and 1440 px: no
  overflow, no console errors, every reveal reached its end state.

## Stage 10 — hardening and final verification

- **Route sweep (Chromium, all 39 routes × 390 and 1440 px, full motion):** no horizontal
  overflow, no console errors, no content left at zero opacity, no error alerts.
- **Reduced-motion fix:** `useSeen` reported a mark as seen only once it scrolled into view,
  even with motion off, so bars below the fold (and in captures or print) sat at zero until
  scrolled. With motion off, marks are now drawn at their values at once.
- **Polish of the rawest lab pages:**
  - Comparison lab: action row; slot controls read "Season" and "Remove", with the player ID
    kept for screen readers so the pinned accessible names are unchanged.
  - Career comparison: numbered name chips, a real empty state, the curve help text shown
    only beside a chart, and a readable status line.
  - Discover: metric names instead of enum keys (shared with the analytics lab) and grouped
    target controls, plus a distance chart drawn from the same evidence as the table (new
    test).
  - Page-level fields get bottom spacing inside the Film Room body.
- **Copy defects:** 26 backend prose strings and 13 frontend captions had run-together words
  ("Licensed2023-24", "recorded2018", "fewer than3", "License2.0", "only;13,867"). Spaces were
  restored; values, identifiers, formulas, HTTP headers and data snapshots are unchanged
  (the immutable lineup snapshot was restored byte-for-byte after a mis-scoped formatter
  run). Backend **413/413**.
- **Keyboard walkthrough (Chromium):**
  - Skip link is reachable (Shift+Tab from the focused heading). Every tab stop on home
    shows a visible ring.
  - `/` opens search; arrow keys and Enter reach a player.
  - Chart arrow keys announce values; Shot Studio views switch from the keyboard.
  - The mobile menu traps focus across 40 tabs; Escape closes it and returns focus to Menu.
- **Search focus bug (browser-only):** the overlay's exit animation keeps it mounted for
  ~260 ms, so restoring focus to the opener ran after the new page had focused its heading,
  and focus was pulled back to the opener. Focus is now restored only when the overlay is
  dismissed without a choice. Verified with full and reduced motion. The shell tests assert
  both contracts, but jsdom skips the exit animation and cannot reproduce the ordering.
- **Transform/opacity audit:**
  - The player-hub score bug animated `width` (a per-frame reflow). It now fades and slides
    with `popLayout`, and the tabs follow with a transform layout animation.
  - `BarChart` tweened SVG `y`/`height`. Bars now span their side of the baseline and scale.
    In Chromium, animated bars settle at exactly the static geometry (0 px difference on 28
    bars); a new unit test covers positive, negative and missing values.
  - The skip link uses a transform.
  - Scroll and pointer effects are motion values. Pointer handlers set state only when a
    discrete index changes; there is no React state per frame.
- **Bundle (correction):** Stage 3 compared main chunks only ("−33 %"), but Motion ships in
  its own initially loaded chunk. Measured like for like, after rebuilding `b4e5f88` in a
  scratch worktree and reading each build's `index.html` preloads:

  | Initial load | Baseline `b4e5f88` | Now                               |
  | ------------ | ------------------ | --------------------------------- |
  | JS chunks    | `index` + `dist`   | `index` + Motion + `createApiUrl` |
  | JS raw       | 805.3 kB           | 637.4 kB (−20.8 %)                |
  | JS gzip      | 235.2 kB           | 196.5 kB (−16.5 %)                |
  | CSS gzip     | 8.8 kB             | 23.7 kB                           |
  | JS+CSS gzip  | 244.0 kB           | 220.2 kB (−9.8 %)                 |

  Fonts are self-hosted (204 KB in total, three faces preloaded, OFL licences in
  `frontend/public/fonts`). No chunk exceeds 500 kB, so the baseline warning is gone.

- **Final results on `claude/nba-explorer-design`:**
  - `npm run validate`: exit 0. Frontend **347/347**, backend **413/413** (760 tests); lint 0
    errors (13 react-refresh warnings for non-component exports); typecheck and builds pass.
  - Playwright: **117/117**, i.e. smoke 78/78 (desktop and phone) and axe 39/39 routes with
    zero serious/critical violations. Axe scans once at desktop width; its 39 phone entries
    are skipped by design.

## Hotfix — blank page on Windows (case-only module names)

- **Defect (release-blocking, reported on Windows at `436cb60`):** after `npm ci` and
  `npm run dev`, both servers started but `http://localhost:5173` stayed black. Chrome showed
  `Uncaught SyntaxError: The requested module '/src/charts/Court.ts' does not provide an export
named 'Court'` (from `HomePreviews.tsx:10`).
- **Root cause:** `frontend/src/charts/` held two modules whose names differ only by case:
  `Court.tsx` (the court component, added in Stage 1) and `court.ts` (court geometry). Four
  files imported the component without an extension (`'../../charts/Court'`). Vite tries
  `.ts` before `.tsx`, so on a case-insensitive filesystem (Windows, default macOS) the lookup
  `Court.ts` matched `court.ts`, which has no `Court` export, and the app failed to start. On
  Linux `Court.ts` does not exist, so resolution fell through to `Court.tsx`. Every check ran
  on Linux, so typecheck, unit tests, build and the Playwright suites all passed.
- **Reproduced on Linux before the fix:**
  - A case-insensitive mount was not possible here: the kernel lacks Unicode case folding
    and vfat is unavailable.
  - Instead, a shadow copy of `frontend/` was built showing what a case-insensitive
    filesystem shows: wherever two stems differ only by case, each spelling answers for
    each extension, so `charts/Court.ts` exists with `court.ts`'s contents.
  - On that view, `vite build` failed with `"Court" is not exported by
"src/charts/Court.ts"` (four errors, one per importer).
  - The dev server in Chromium threw the reported error verbatim. The homepage and Shot
    Studio rendered nothing (no h1, zero text) under both full and reduced motion.
- **Fix:**
  - The component module is now `charts/BasketballCourt.tsx`, exporting `BasketballCourt`
    (`git mv`, so history follows). The geometry module stays `charts/court.ts`.
  - All four importers are updated: `FoundationPage`, `HomePreviews`, `PlayerProfileHero`
    and `ShotCourt`.
  - Repository audit: this was the only case-only collision. No other file names, module
    stems or folder names in the repository differ only by case.
- **Regression check (`npm run check:module-case`, now part of `npm run validate`):**
  - `scripts/check-module-case.mjs` is dependency-free. It fails when two entries in a
    folder differ only by case, or when two modules (or a module and a folder) share an
    import stem ignoring case.
  - It also resolves every relative import case-sensitively and with case-insensitive
    lookups, in both Vite's and TypeScript's extension order, and fails if the two disagree
    or a specifier only matches when case is ignored.
  - Its `--self-test` recreates this defect and the fixed layout, plus a mis-cased
    specifier and a module-versus-folder clash.
  - On the unmodified `436cb60` tree it fails with the collision and all four importers in
    both orders. On the fixed tree it passes, scanning 61 folders, 364 source files and
    1,086 relative imports.
- **Verification after the fix:**
  - **Fresh `npm run dev`, Chromium, Full and Reduced motion:** home, Shot Studio
    (`/lab/shots?players=201939`) and a no-photo player hub (`/players/1628973`, whose hero
    draws the court) each load with no page errors, console errors or failed responses.
    Each renders its h1 and body text and draws its courts: home 2 courts and 100 shot
    marks, Shot Studio 1 court and 100 shot marks, player hub 1 court.
  - **Case-folded view of the fixed tree:** no aliases arise, `vite build` passes, and the
    same six browser runs pass.
  - `npm run validate`, Playwright and the commit are recorded in the entry below.
- **Separate observation, not fixed here:** if the page is opened before the backend is
  listening (cold `npm run dev`), the homepage's game preview can get one 503 from the dev
  proxy and say its archive is unreachable until a reload. The page itself renders; once
  the backend is up there are no failed responses.
