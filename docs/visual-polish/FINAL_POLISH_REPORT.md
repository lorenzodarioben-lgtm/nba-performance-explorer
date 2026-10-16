# NBA Performance Explorer — final cinematic polish

READY FOR OWNER REVIEW · 17 October 2026 · `codex/nba-explorer-final-polish`

Implementation HEAD: `07055db`. Based on the verified `claude/nba-explorer-3-ux-polish`
HEAD `5cc481ab8c3b94e02dcf990769d80c00fc3be881`. The evidence/documentation commit follows
this implementation commit; `git log -1` identifies the final delivery HEAD.

## Delivered improvements

| #   | Requested improvement                                     | Implementation and relevant files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Wembanyama composition and feathered left edge            | `home.css` owns the complete geometry. Removed the later 106% width / 6% inset override from `assets.css`; desktop image fills a 59vw, maximum 1000px frame without an inset edge. A multi-stop horizontal mask feathers the real source boundary; the lower mask remains. At 1440 × 900, the geometric crop retains approximately 90% of the original height, versus 81% before feathering in the baseline. The 1199 × 1312 source, responsive registry, facial focal point, pointer depth, reveal and scroll motion remain. Mobile keeps its original 104% framing. No source photography was altered. |
| 2   | Slightly smaller READ THE GAME.                           | Every bound of `.homehero__line`'s clamp is multiplied by 0.96: a 4% reduction at every viewport. Same Saira Condensed, line breaks, weight, colours and reveals.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 3   | Shorter homepage description                              | `FoundationPage.tsx` uses the exact supplied replacement. Research source notes are preserved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 4   | Larger logos on all 30 cards                              | `TeamsPage.tsx` requests 62px marks instead of 48px: 29% greater linear size, using the high-resolution mark variant. `assets.css` retains contain sizing, reserves two lines for names and uses uniform grid rows. All thirty marks, especially GSW, Houston, Spurs, Lakers, Clippers and Jazz, were reviewed and measured without identity overlap. Recorded records and season-aware mappings remain.                                                                                                                                                                                                 |
| 5   | Premium search controls                                   | `shell.css` and `PlayerCombobox.tsx` introduce a shared icon rail, restrained surface, open-sided geometry, bottom rule and precise focus treatment. Navigation is 38px; research fields 54px; Arena fields 60px. The shortcut sits behind a hairline divider. Compact navigation becomes icon-only at tablet widths. Homepage, player landing and comparison fields inherit the same accessible combobox. No API or search-state changes.                                                                                                                                                               |
| 6   | Three distinct cinematic headers and no Pictured captions | Scoreboard: horizontal broadcast window, lower title strap, red edge, Kawhi visible above the mobile title. History: warm inset archive print, asymmetrical title and timeline ticks. Compare: diagonal matchup photograph and red seam leading toward the selectors. Changes are in `league.css`, `history.css`, `compare.css` and the corresponding page components. Descriptive captions are removed; scene alt metadata and provenance documentation remain.                                                                                                                                         |
| 7   | More visible confirmed-service LED                        | `home.css`: 10px green core, layered halo reaching 25px, 2.8-second breathing cycle and a separate soft ring. Neutral connecting and unavailable states are unchanged and tested. Only a validated health response produces green.                                                                                                                                                                                                                                                                                                                                                                       |
| 8   | More noticeable brand feedback                            | `shell.css`: a short 40px red underline and controlled mark brightening. Fine-pointer hover is gated; keyboard focus has an outline and the same accent. No masthead dimensions move; reduced motion resolves immediately.                                                                                                                                                                                                                                                                                                                                                                               |
| 9   | Interactive liquid VS ball                                | New `LiquidVersus.tsx` and `liquidModel.ts`: real velocity-sensitive linked surface simulation, described below. Resting object and existing comparison composition remain 88px.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 10  | Compact no-photo player heroes                            | `PlayerProfileHero.tsx` uses the verified ID registry and handles actual image-load failure. Scoped `phero--plain` rules in `player.css` place the name, jersey, metadata and actions in an editorial court composition. Terance Mann (`1629611`, a real player with no registry photograph) is the deterministic example. At 1440px the hero shrinks from 738px to 408px; at 1920px from 860px to 408px. At 390px it is 493px versus the photographic hero's unchanged 715px. No substitute portrait or silhouette.                                                                                     |
| 11  | Seven-row table previews                                  | `RowCollapse.tsx` defaults to seven. Both `PlayerGameLog.tsx` and `PlayerCareerTrends.tsx` use that default. Seven or fewer rows show naturally; eight or more get the disclosure. Hidden attributes, accurate counts, gradient fade, native button focus, expansion and chart-triggered reveal remain. Other tables are unaffected.                                                                                                                                                                                                                                                                     |

## Liquid surface architecture

- 64 radial surface nodes carry displacement and velocity. Restoring stiffness, neighboring
  surface tension, damping and mean-displacement pressure recover the circular resting shape.
- Pointer events sweep a line segment through the surface, avoiding missed fast swipes.
  Distance divided by event time controls impulse strength; direction controls drag and recoil.
  A narrow pressure crest and negative wake create local ripples alongside broad displacement.
- Canvas 2D draws a smooth quadratic contour with a rich red body, meniscus, reflected light
  and restrained halo. The white VS is separate HTML, keeping its reading position stable.
- Bounded integration substeps are no larger than 1/120 second; requestAnimationFrame paints at the display
  cadence. Displacement, drift and velocity are clamped; no unbounded particles or new libraries.
- Rendering starts on disturbance and ends below a small energy threshold. IntersectionObserver
  stops offscreen work; document visibility stops hidden-tab work. Observers and passive pointer,
  scroll and resize listeners are removed on unmount. Geometry is cached between layout events.
- Canvas is capped at 2× device pixel ratio. Coarse pointers, reduced motion (system or app),
  missing canvas, context failure and drawing failure retain an attractive static circle.
- This is a surface-wave approximation, not a volumetric fluid solver. There are no detached
  droplets. This keeps the effect localized and inexpensive without moving selectors or photos.

The final full-suite real-pointer test measured slow-swipe alpha disturbance of 38,751 versus 208,624
for a fast swipe, about 5.4× greater. It verifies recovery, zero resting canvas redraws,
offscreen pause, reduced-motion fallback and the comparison CTA. Physics unit tests separately
compare equal paths at different speeds, direction, damping, bounds and invalid samples.

## Browser evidence

Screenshots live in [`screenshots/final`](screenshots/final). Overview sheets: [1920px](screenshots/final/review-1920.jpg), [1440px](screenshots/final/review-1440.jpg), [1024px](screenshots/final/review-1024.jpg), [390px](screenshots/final/review-390.jpg). `before-*` is the actual
`5cc481a` interface. Long-table before captures were taken from a temporary archived copy of
that commit, using the same expanded, explicitly labelled DEMO fixtures as the after captures;
the original six-game and five-season counts were confirmed. The temporary source copy and
its dependency/asset junctions were removed after capture.

| Change                                 | Before                                                                                                                                       | After                                                                                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero, title, copy, search, service LED | [1440](screenshots/final/before-home-1440.png), [1920](screenshots/final/before-home-1920.png), [390](screenshots/final/before-home-390.png) | [1440](screenshots/final/after-home-1440.png), [1920](screenshots/final/after-home-1920.png), [390](screenshots/final/after-home-390.png)         |
| All team marks                         | [Desktop](screenshots/final/before-teams-all-1440.png), [mobile](screenshots/final/before-teams-all-390.png)                                 | [Desktop](screenshots/final/after-teams-all-1440.png), [mobile](screenshots/final/after-teams-all-390.png)                                        |
| Scoreboard                             | [Before](screenshots/final/before-games-1440.png)                                                                                            | [Desktop](screenshots/final/after-games-1440.png), [mobile](screenshots/final/after-games-390.png)                                                |
| Historical seasons                     | [Before](screenshots/final/before-history-1440.png)                                                                                          | [Desktop](screenshots/final/after-history-1440.png), [mobile](screenshots/final/after-history-390.png)                                            |
| Compare                                | [Before](screenshots/final/before-compare-1440.png)                                                                                          | [Desktop](screenshots/final/after-compare-1440.png), [mobile](screenshots/final/after-compare-390.png)                                            |
| Search selection and focus             | [Before](screenshots/final/before-search-focus-1440.png)                                                                                     | [After](screenshots/final/after-search-focus-desktop.png)                                                                                         |
| Brand and status                       | [Baseline masthead](screenshots/final/before-home-1440.png)                                                                                  | [Hover/focus and pulse](screenshots/final/after-brand-status.png)                                                                                 |
| Liquid VS                              | [Flat circle](screenshots/final/before-liquid-1440.png)                                                                                      | [Rest](screenshots/final/after-liquid-rest.png), [slow](screenshots/final/after-liquid-slow.png), [fast](screenshots/final/after-liquid-fast.png) |
| No-photo player                        | [Before](screenshots/final/before-no-photo-1440.png)                                                                                         | [Desktop](screenshots/final/after-no-photo-1440.png), [mobile](screenshots/final/after-no-photo-390.png)                                          |
| Photo player unchanged                 | [Before](screenshots/final/before-photo-1440.png)                                                                                            | [After](screenshots/final/after-photo-1440.png)                                                                                                   |
| Game table                             | [Six rows](screenshots/final/before-table-games-1440.png)                                                                                    | [Seven rows](screenshots/final/after-seven-games-desktop.png)                                                                                     |
| Career table                           | [Five rows](screenshots/final/before-table-seasons-1440.png)                                                                                 | [Seven rows](screenshots/final/after-seven-seasons-desktop.png)                                                                                   |

All eight required route examples were exercised at 1920 × 1080, 1440 × 900, 1024 × 900
and 390 × 844: `/`, `/teams`, `/games`, `/history`, `/compare`, `/players/2544`,
`/players/1629611` and `/players/2544/career`. All 32 combinations report zero horizontal
page overflow, broken loaded images or uncaught page errors; see
[`after-checks.json`](screenshots/final/after-checks.json). A separate console/HTTP audit of all eight routes at 1440px found zero console errors or HTTP errors; see [`console-checks.json`](screenshots/final/console-checks.json). Native mobile lazy loading was
also exercised by scrolling through every team mark.

Reproduce settled captures with the fixture backend running:
`node scripts/capture-final-polish.mjs after`. Set `PW_CHROMIUM_PATH` if the local browser
is outside Playwright's default location. Interactive assertions live in `e2e/final-polish.spec.ts`.

## Verification

`npm run validate` completed with exit 0: formatting, lint (zero errors, 13 existing warnings),
module-case checks, asset integrity, TypeScript, all 527 frontend tests, all 532 backend tests
and both production builds passed. After the final swept-path guard correction, the affected
homepage/liquid suites passed again, 15/15. The broader targeted component/physics group passed
39/39. `npm run e2e` completed on implementation HEAD `07055db`: **230 passed, 74 intentionally skipped, zero failed**, in 7.3 minutes. The skips are 73 duplicate mobile axe cases plus the mouse simulation on touch. Full logs: [validation](verification/validate.txt), [E2E](verification/e2e.txt), [separate asset check](verification/assets.txt).
The separate `npm run check:visual-assets` also passed: 401 files, 73 players, 45 marks and
1,257 matched team-seasons. No dependencies changed.

The mechanical design scan reported three existing accent-stripe warnings in untouched
search-overlay and player-detail rules. They remain part of the incumbent design, including
selected-result feedback. No new detector finding was introduced in the changed controls.

## Accessibility and limits

Search labels, option navigation, shortcuts (`/`, Ctrl+K, Cmd+K), Escape, route selection and
focus return were exercised. Table buttons expand and collapse using Enter; seven hidden-row
boundaries agree with assistive visibility. Decorative photography remains out of the landmark
and reading hierarchy, and the decorative liquid object never traps a pointer or a tab stop.

The browser run uses the existing explicit fixture provider and bundled archives. Extended
tables are test-only layout fixtures, never real results. NBA.com production connectivity and
Andre Turner's live profile were not used as evidence; Terance Mann supplies the real no-photo
identity. Physical low-power GPU and touch-device performance is not certified; touch uses the
static surface. The supplied scene images still have no recorded reuse licences. Existing
rights/provenance notes were checked and retained; the removed Pictured strings were descriptive
captions, not documented mandatory attributions.

## Git and owner handoff

- `2f3f3b3` — composition, search and distinct page identities.
- `fa81f34` — liquid simulation, compact player heroes and seven-row disclosures.
- `cde9ed7` — final mobile broadcast crop, uniform team rows and capture tooling.
- `07055db` — full-object cursor jumps are included in swept surface interaction.
- Closing documentation/evidence commit follows these implementation checkpoints.

Remote baseline pointers were verified: UX branch `5cc481a`, `main` `cd557e4`. The feature branch is pushed to `origin`. Tracked files are clean after the closing evidence/documentation commit; only the preserved, pre-existing untracked `.claude/` settings remain. The local `NBA_ASSETS` staging folder is untouched. No merge, deployment, force-push or pull request is part of this delivery.

Recommended next action: review this feature branch locally, starting with the homepage liquid
interaction and the before/after evidence above.
