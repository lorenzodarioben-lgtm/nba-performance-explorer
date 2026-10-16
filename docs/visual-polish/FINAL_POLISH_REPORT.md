# Final polish report: 3.3 UX polish

Branch `claude/nba-explorer-3-ux-polish`, cut from `claude/nba-explorer-3-visual-assets` at
`1a2bb9c`. Not merged, not deployed, no pull request. Screenshots are in
[`screenshots/`](screenshots/); they are production-style renders in headless Chromium against the
dev server, with the backend in fixture mode.

## Work completed

| Work                                                                                                     | Commit    | Where                                |
| -------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------ |
| Collapsible game log (6 games) and career table (5 seasons)                                              | `8b90f93` | `ui/RowCollapse.tsx`, player profile |
| Kyrie Irving: new profile photo; matchup photo reused (now on the Compare page, see the correction pass) | `7184970` | `/players/202681`, home              |
| Kobe Bryant and Shaquille O'Neal header on the season navigator                                          | `f54608c` | `/history` (index only)              |
| Team directory plates: fuller, mark in its own row, GSW collision fixed                                  | `c714bbc` | `/teams`                             |
| Masthead search field refinement                                                                         | `8c08edd` | every page                           |
| Kawhi Leonard buzzer-beater scoreboard header                                                            | `12c5cbf` | `/games`                             |
| Home: moving ribbon, TIP OFF close, green status dot, hero type, comparison copy and CTA                 | `b6c6ad7` | home                                 |

### Collapsible tables

- **Previews.** The game log opens with six games and the career table with five seasons. A
  fade and a bar show the real count ("6 of 74 games") and a disclosure button ("View all 74
  games" / "Show less"). The charts above stay complete.
- **Accessibility.** Hidden rows use the `hidden` attribute, so assistive technology and the
  screen agree. The button is a native `button` with `aria-expanded` and `aria-controls`.
- **Motion.**
  - The height animates over 420 ms; reduced motion skips it.
  - Collapsing from below the table's top keeps the button still under the pointer.
  - The settled height equals the measured target, because the body is a block formatting
    context.
- **Chart link.** Selecting a chart bar for a hidden game opens the log.
- **Short tables.** A table at most one row over its preview never collapses.

### Kyrie Irving (202681)

- **Profile.** `NEWKYRIEPLAYERIMAGE.jpg` is the profile hero (`irving-{640,960,1500}.webp`). It
  frames his face at 1440 and 390 px.
- **Matchup photo.** The earlier matchup photo became the `kyrie-matchup` scene. It first sat
  above the VS mark on the home page; the correction pass moved it to the Compare page header.
- **Identities.** The alt text does not name the Brooklyn defender, who is not identified.
- **Other players.** The other 72 player mappings are byte-identical.

### Scoreboard header (`/games`)

- **Source.** `NBA_ASSETS/buzzerbeater.webp` (2519×1889) becomes `kawhi-buzzer-{800,1280,1920}.webp`.
- **Composition.**
  - The photograph fills the right of the page head (up to 920 px wide).
  - It dissolves into the charcoal through left and bottom masks.
  - A dark directional wash keeps SCOREBOARD and the lede on a quiet ground, and a low red light
    rises from the floor.
  - On phones the photograph sits above the title.
- **Caption.** "Pictured: Kawhi Leonard's 2019 playoff buzzer-beater, Raptors v 76ers". It is
  never presented as the date or game on screen.
- **Unchanged.** The heading, copy, links, filters and data. Kawhi Leonard's profile photo is
  untouched.
- **Cost.** The head grows by about 80 px at 1440 px.

### Season navigator header (`/history`)

- The `kobe-shaq` scene fills the right of the head, masked into the page.
- The caption names who is pictured.
- It is shown on the all-seasons index only, never on `/history/:season` (a test asserts it).

### Team directory

- **Layout.** Each plate is a column, with the mark in its own top row. Two-line names (Golden
  State Warriors, Washington Wizards, Minnesota Timberwolves, New Orleans Pelicans, Portland Trail
  Blazers) grow the plate instead of pushing the abbreviation into the mark.
- **Measured.** No overlap on any of the 30 plates at 390, 1024, 1440 and 1920 px.
- **Fixed.** A list bullet indent and item padding had made plates 18 px narrower than their
  cells, with uneven gaps.
- **Size.** Plates are about 13% wider (147 px at 1440, still 8 columns) and equal height per row.

### Masthead search

- 36 px field with a softer hairline border, faint top highlight and 3 px radius.
- A centred square "/" chip.
- Restrained hover and a red focus outline.
- A hairline divider before MY NBA.
- `/`, Ctrl/Cmd+K and a click still open the overlay.

### Home

- **Ribbon.** The original `LandingMarquee` sits directly below the hero.
  - Condensed uppercase labels with red dots between hairlines.
  - The track is two identical halves of about 4,040 px, so the -50% loop has no seam on any
    screen. It moves at a constant ~50 px/s (80 s per half), measured at 390, 1440 and 1920 px.
  - Paused on hover; still under reduced motion.
  - No horizontal page scroll.
- **TIP OFF.** The original closing section is above the footer: oversized stacked TIP / OFF and
  a bordered SEARCH A PLAYER ↑. The button scrolls back to the hero search and focuses its
  combobox (instant under reduced motion). The footer is unchanged.
- **Service status.**
  - Available: a small green dot (#22c55e) with a faint halo that breathes once every 3 s (a
    3 px, 7% halo), not animated under reduced motion.
  - Connecting: a neutral ring.
  - Unavailable: no dot.
  - Tests cover each state.
- **Hero type.** The headline and lede are about 4% smaller: 216 to 207 px and 20 to 19.2 px at
  1440; 80 to 76.8 px and 17 to 16.3 px at 390.
- **Comparison.**
  - The copy reads "Compare two players, explore their numbers and career arcs, then share the
    matchup."
  - COMPARE TWO PLAYERS is back in the original condensed display type: Saira Condensed, 700,
    uppercase, 16×32 padding, darker red hover, visible focus outline. It still links to
    `/compare`.

## Correction pass after live review

- **Home comparison band.** Reverted to Wembanyama | VS | LeBron, with no still above the VS
  mark. The new copy and condensed CTA stay.
- **Compare page.** The `kyrie-matchup` scene is now the `/compare` header photograph: right
  side, masked, captioned, decorative. The selectors are unobstructed.
- **Search.** One premium dark field style for the masthead control and the player search field,
  with refined border, highlight, focus ring and glow, and a keycap "/" chip.
- **Hero.** Wembanyama is drawn at 106% of the frame instead of 115%, so about 84% of the photo's
  height shows instead of 77%.
- **Status dot.** A brighter, larger green dot, a stronger glow, and a soft expanding ring every
  2.5 s.

New or replaced screenshots:

- [`compare-page-after-1440.jpg`](screenshots/compare-page-after-1440.jpg)
- [`compare-page-after-390.jpg`](screenshots/compare-page-after-390.jpg)
- [`home-compare-after-1440.jpg`](screenshots/home-compare-after-1440.jpg)
- [`home-hero-after-1440.jpg`](screenshots/home-hero-after-1440.jpg)
- [`home-hero-after-390.jpg`](screenshots/home-hero-after-390.jpg)
- [`search-and-status-states.jpg`](screenshots/search-and-status-states.jpg): masthead rest,
  hover and focus; focused player field; status dot.

## Visual evidence

| Screenshot                                                                                                                                           | What it shows                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [`scoreboard-before-after-1440.jpg`](screenshots/scoreboard-before-after-1440.jpg)                                                                   | `/games` head before (top) and after                          |
| [`scoreboard-after-1920.jpg`](screenshots/scoreboard-after-1920.jpg), [`scoreboard-after-390.jpg`](screenshots/scoreboard-after-390.jpg)             | wide desktop and phone                                        |
| [`history-before-after-1440.jpg`](screenshots/history-before-after-1440.jpg), [`history-after-390.jpg`](screenshots/history-after-390.jpg)           | season navigator                                              |
| [`teams-before-after-1440.jpg`](screenshots/teams-before-after-1440.jpg)                                                                             | team plates before (GSW collision, narrow plates) and after   |
| [`kyrie-profile-after-1440.jpg`](screenshots/kyrie-profile-after-1440.jpg), [`kyrie-profile-after-390.jpg`](screenshots/kyrie-profile-after-390.jpg) | Kyrie Irving's new profile hero                               |
| [`home-hero-after-1440.jpg`](screenshots/home-hero-after-1440.jpg), [`home-hero-after-390.jpg`](screenshots/home-hero-after-390.jpg)                 | hero type and green status dot                                |
| [`home-ribbon-1440.jpg`](screenshots/home-ribbon-1440.jpg)                                                                                           | restored ribbon                                               |
| [`home-compare-after-1440.jpg`](screenshots/home-compare-after-1440.jpg)                                                                             | comparison band: Kyrie matchup still, new copy, condensed CTA |
| [`home-tipoff-1440.jpg`](screenshots/home-tipoff-1440.jpg), [`home-tipoff-390.jpg`](screenshots/home-tipoff-390.jpg)                                 | TIP OFF close                                                 |

- **Home before.** The visual-assets home capture,
  [`../visual-assets/screenshots/home.jpg`](../visual-assets/screenshots/home.jpg), is the "before"
  for the home changes.
- **Kyrie before.** His earlier profile photo is the matchup still now shown in the comparison
  band.

## Automated verification

Runs on 2026-10-17, after every change above. Commits after them touched documentation only.

| Check                                                             | Result                                                                                                          |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm run format:check`                                            | pass                                                                                                            |
| `npm run lint`                                                    | 0 errors, 13 warnings (unchanged)                                                                               |
| `check:module-case`                                               | pass                                                                                                            |
| `check:visual-assets`                                             | pass: 73 players, 45 team marks, 3 scenes; 401 files; 604 archive and 653 franchise-record team-seasons matched |
| `npm run typecheck`                                               | pass                                                                                                            |
| Frontend tests (Vitest)                                           | **516 / 516** (82 files)                                                                                        |
| Backend tests (Vitest)                                            | 531 / 532 in the full run; see below                                                                            |
| `npm run build`                                                   | pass                                                                                                            |
| `npm run e2e` (Playwright, desktop 1440 and mobile 390, with axe) | 216 passed, 73 skipped, 1 failed; see below                                                                     |
| `npm audit` / `npm audit --omit=dev`                              | 0 / 0 vulnerabilities                                                                                           |
| Production build (port 4310)                                      | 8 routes at 1440 and 390 px: no broken images, no failed requests, no external hosts, no horizontal overflow    |
| Offline simulation (port 4320, network blocked)                   | the same 8 routes at both widths: clean                                                                         |

**The two full-run failures are timing failures.**

- **Backend:** `league-players.test.ts` › "validates the player routes" hit its 20 s timeout under
  full-suite load. It passes **8/8** alone. This branch changes no backend code. In the previous
  full run, a different test in the same folder (`league-records.test.ts`) timed out the same way
  and also passed alone.
- **E2E:** `a11y.spec.ts` › "player-career has no serious accessibility violations" [desktop]
  reported 2 colour-contrast nodes once in the 7.7-minute run. Run alone it passed **2/2**
  (`--repeat-each=2`). That page's fixture has four seasons, so the collapsible table does not
  engage there.

Routes checked on the production and offline builds: `/`, `/games`, `/history`,
`/history/1999-00`, `/teams`, `/players/202681`, `/players/2544` and `/players`.

Rendered checks against the dev server:

- **Home ribbon.** Halves of 2,020 px each (before the track was doubled to two copies per half).
  It moves at ~50 px/s, sits directly under the hero, pauses on hover, and never overflows the
  page.
- **TIP OFF.** It returns the visitor to the search and focuses its combobox.
- **Status dot.** It breathes on a 3 s cycle.
- **Team plates.** No collisions at four widths.
- **Search shortcuts.** `/` and Ctrl+K both open the overlay.

## Known limitations

- **Fixture backend.** NBA.com did not respond from this machine. Rendered checks used the fixture
  backend, and the 74-game log was checked with fixture data enlarged in the page.
- **Image rights.** Image usage rights are as recorded in `docs/visual-assets`. The scene
  photographs carry no supplied licence metadata; publication remains the owner's decision.
- **Doc snapshots.** `ASSET_INVENTORY.md` tables generated before 3.3 are unchanged; the 3.3
  additions are listed in their own section.
