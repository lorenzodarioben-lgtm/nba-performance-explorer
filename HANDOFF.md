# Homepage micro-polish — latest handoff

17 October 2026 · `codex/nba-explorer-final-polish` · starts from `dafff91`.
The commit containing this correction is the delivery commit (`git log -1 --oneline`).

- Strengthened the restored logo hover from `translateY(-1px) rotate(-3deg)` to
  `translateY(-2px) rotate(-6deg)`. Same 220ms snap easing, image dimensions, home link,
  keyboard outline, fine-pointer gate and system/in-app reduced-motion guards.
- Expanded the right-anchored hero photo from `min(59%, 1000px)` to `min(64%, 1120px)`.
  Its left edge moves 120px / 72px / 51.2px left at 1920 / 1440 / 1024 widths. Earlier
  mask stops reveal more defender detail, dissolving from alpha zero to solid at 34%
  instead of 40%. Cover fit and the registry's `center 3%` focal point remain. Updated
  responsive `sizes`; mobile retains its approved full-width frame and bottom fade.
- Hero search wrapper now uses `background: transparent` at idle, hover and focus.
  Removed the 3px backdrop blur, focus shadow and fill transition. Thin border,
  hover brightening, red focus border, label, icon, text and status indicator remain.
  Input, both wrappers and pseudo-elements compute alpha zero with no background image,
  blur or shadow. Their opacity stays 1. Results remain solid `#111114`.
- Actual Chromium evidence: `docs/visual-polish/screenshots/home-micro-polish/` contains
  before/after home and focused-search captures at 1920×1080, 1440×900, 1024×900,
  390×844, plus computed layer/image measurements and search-state screenshots.
  No overflow, uncaught errors or headline-size changes at those four sizes.
- Focused header/home/search unit tests: **31 passed**. Direct logo hover/return,
  fixed navbar geometry, focus, reduced motion, home link/mobile menu, search loading,
  solid results, keyboard selection, empty/error feedback and other search scopes checked.
- `npm run validate` passes: **541 frontend and 532 backend tests**, formatting,
  module-case/assets, frontend/backend types and production builds. Lint: zero errors,
  the same 13 existing warnings. Separate `npm run check:visual-assets` passes:
  401 files, 73 players, 45 marks and 1,257 team-seasons.
- Full `npm run e2e`: 240 passed, 78 intentional skips, two failures in the concurrent
  run (unavailable health status and a 0.2px comparison entrance/layout sample).
  `npm run e2e -- --last-failed --workers=1`: **2/2 passed unchanged** after validation.
  All **242 unique browser tests pass across these runs**. Skips: 73 duplicate mobile
  axe checks, four mouse-only liquid checks on touch and one duplicate headline check.
  Initial frontend/backend timing failures also clear in the clean sequential full
  validation. No test timeout, physics code or layout assertion was changed.
- Production changes are limited to hero CSS, one logo transform and hero image `sizes`.
  Shared combobox behavior, liquid physics, history, status LED, assets and other pages
  remain unchanged. Preserve `.claude/`. No main changes, PR, merge or deployment.

---

## Previous logo-restoration handoff (preserved)

# Original NBA logo hover restored — latest handoff

17 October 2026 · `codex/nba-explorer-final-polish` · starts from `7b78d7f`.
The commit containing this correction is the delivery commit (`git log -1 --oneline`).

- Restored the exact `5cc481a` logo movement, `translateY(-1px) rotate(-3deg)`, and
  `transition: transform var(--dur-base) var(--ease-snap)` — the same 220ms and
  `cubic-bezier(0.2, 0.8, 0.2, 1)`. Removed the newer brightness/red-underline treatment.
- Kept the existing image, 32px CSS height, automatic width, brand navigation and
  visible keyboard outline. Fine-pointer hover and system/in-app reduced-motion guards
  preserve touch and accessibility behavior. Only the image moves; navigation stays fixed.
- `AppHeader.tsx` is unchanged. The CSS diff is limited to brand rules; search, homepage,
  liquid physics, history and unrelated styles/assets are unchanged.
- Focused verification: **6 header unit tests and 2 Chromium desktop/mobile tests pass**.
  Direct image hover reaches exactly -1px / -3 degrees, returns smoothly to rest, retains
  image layout dimensions and causes no navbar/search layout shift. Keyboard outline,
  system/in-app reduced motion, home navigation and mobile menu logo navigation pass.
- Full lint, frontend/backend typecheck and production builds pass. Lint has zero errors
  and the same 13 existing warnings. Changed-file formatting and `git diff --check` pass.
- Existing `.claude/` and raw `NBA_ASSETS` are preserved. Same feature branch; no main
  changes, PR, merge or deployment.

---

## Previous liquid physics 3.0 handoff (preserved)

# Liquid VS physics 3.0 — latest handoff

17 October 2026 · `codex/nba-explorer-final-polish` · starts from `8fef36c`.
Implementation checkpoint: `3a4ec0b`.
The commit containing this update is the delivery commit (`git log -1 --oneline`).
Earlier handoffs below are retained.

- **Status:** READY FOR OWNER REVIEW. Implementation, bounded visual confirmation,
  full validation and full desktop/mobile browser regression complete.
- **Cause:** previous speed buckets, fixed radii/angle spacing, a 900px/s gate and global
  cooldown replayed the same fast fan. An 8ms timestamp floor understated frequent samples.
- **Model:** keep 64-node coupling/restoring pressure; integrate actual chord contact,
  velocity, bounded acceleration and incidence into local tensile work. Outward crest
  motion, displacement, neighbour strain and residual work govern pinch-off. No speed-to-count rule.
- **Variation:** injectable RNG; bounded material/nucleation perturbations and skewed
  sizes. Seeded runs reproduce the whole state. Each drop pays a size/cohesion cost,
  drains the local moving crest and recoils the main mass. Failed necks dissipate work.
- **Motion:** 16 preallocated slots, radii 1.15–6px, varying directional momentum, local
  shear and drift inheritance; brief narrowing neck; damped stretch/wobble; viscous drag,
  near-body attraction, slight gravity and smooth shrink/reabsorption. Nominal life 0.52–1.02s.
- **Protections:** same 208px canvas, DPR/speed/delta caps, stable 120Hz substeps,
  idle/offscreen/hidden-tab stop, passive listeners and cleanup. No React frame updates.
  Static touch/reduced-motion/canvas-failure fallback and stationary label preserved.
- **Actual mouse trials:** final 20-per-speed run: slow 1–2 (mean 1.40), medium 2–4
  (3.05), fast 3–6 (5.00). First independent fast run ranged 3–7. Zero-drop trials in
  those slow/medium/fast browser groups: zero; seeded gentle groups are 20/20 zeros and
  seeded slow has two zero outcomes. Browser wall speeds average 189/441/1282px/s.
  A third independent run in the full suite passes with slow/medium/fast means
  1.30 / 3.35 / 5.15 and ranges 1–2 / 2–4 / 3–7 (20 trials each).
- **Visual proof:** actual video/frames show necks, independent masses, edge/centre,
  horizontal/vertical/diagonal and repeated interactions during recovery. Pixel-exact
  original resting circle at all four requested widths; label/title/images remain fixed.
  No page overflow. Six repeated strokes produce 37 total detachments, with a bounded active pool.
- **Performance:** focused synthetic 4× CPU run: median 16.7ms, p95 16.8ms; no further
  draws during 300ms settled observation. No physical laptop/GPU certification.
- **Tests:** 17 focused model/fallback tests pass. New browser checks and sparse-swipe
  regression pass; legacy pixel check passes after waiting for stable fonts/layout,
  retaining all assertions. Full `npm run validate` passed: 541 frontend tests, 532 backend
  tests, types, assets, formatting and production builds. Lint has zero errors and the
  same 13 existing warnings. Full `npm run e2e`: **238 passed, 78 intentional skips,
  zero failures**, 7.8 minutes. Skips: 73 duplicate mobile axe cases, four mouse-only
  liquid checks on touch and the duplicate mobile four-width headline check.
  Final changed-file formatting passed. Separate asset check
  passes: 401 files, 73 players, 45 marks, 1,257 team-seasons. No dependency changes.
- **Evidence:** [full report](docs/visual-polish/FINAL_POLISH_REPORT.md),
  [actual movie](docs/visual-polish/screenshots/liquid-physics-3/motion-closeup.webm),
  [frame sequence](docs/visual-polish/screenshots/liquid-physics-3/frame-sequence.png),
  [raw repeated trials](docs/visual-polish/screenshots/liquid-physics-3/browser-trials.json).
- **Limits:** bounded 2D approximation, not CFD or exact volume conservation. Counts
  can repeat; artistic ranges are not spawn quotas. Player API uses fixtures in browser
  checks; production NBA connectivity and physical touch/GPU hardware are unverified.
- **Scope:** liquid model/renderer, directly related tests/tooling/reports only. No styles,
  homepage headline/search/images, history, navigation, backend/data, registries or dependency
  changes. No new hook suppressions; `.claude/` and raw `NBA_ASSETS` stay unstaged.
  Main and other work preserved. No PR, merge, deployment or history rewriting.

**Exact next action:** open `http://localhost:5173/`, scroll to the red VS ball,
and compare slow centre and fast edge strokes. Existing frontend/fixture backend remain available.

---

## Previous liquid 2.0 and archive handoff (preserved)

# Liquid physics 2.0 and historical archive — latest handoff

17 October 2026 · `codex/nba-explorer-final-polish` · starts from `699e5ac`.
Implementation checkpoints: `ea38eca` (home/liquid), `4958260` (archive).
The commit containing this update is the final delivery commit; resolve with `git log -1`.
The earlier handoffs below are retained as history.

- **Status:** READY FOR OWNER REVIEW. Implementation, independent visual review,
  full validation and full desktop/mobile browser regression complete.
- **Headline:** exactly 3% smaller than the current `699e5ac` clamp at every width; same
  font, two-line white/red composition, paragraph, motion and photographic geometry.
- **Search:** hero-only charcoal alpha 0.36 idle / 0.44 hover / 0.50 focus; blur 3px.
  Foreground opacity and opaque results are preserved. Loading, Escape, arrow keys,
  Enter selection and existing masthead shortcuts pass browser checks.
- **Liquid:** original 64-node model extended with a 12-slot reusable droplet pool.
  Detachment needs speed ≥900px/s, an actual swept boundary crossing, sufficient energy
  and an outward-moving crest. 2–5 varied masses launch with directional momentum;
  separation drains crest velocity and applies recoil. A 75ms neck pinches off; drag,
  cohesion and slight gravity lead to reabsorption/disappearance within 0.64–0.82s.
  Flight is local to a 208px decorative canvas. Original 88px CSS circle, colour,
  restrained glow and stationary VS return exactly at rest. Idle/offscreen/hidden-tab
  stops, DPR cap, touch/reduced-motion fallback and cleanup remain.
- **Archive:** dramatic true-subject Kobe/Shaq photo stage; refined year/entity filter
  deck and reset; derived range/count; selectable decade chapters and chronological
  spines; recorded research links; accessible source-index disclosure; save/share.
  URL validation/semantics, source labels/links, missing champions and provenance remain.
  Detail pages, query-preserving adjacent seasons and the 2023–24 hub are retained;
  no index photograph is used as a specific season image. No invented historical facts.
- **Visual verification:** homepage/index/2023–24 detail at 1920×1080, 1440×900,
  1024×900 and 390×844: one h1, zero overflow/browser errors. Original resting circle
  pixels match `5cc481a` exactly at all four widths. Fast mouse frames contain five
  disconnected red regions; gentle passes have none. Repeated/diagonal swipes, recovery
  and idle draw stop pass. Focused 4× CDP CPU throttle: median 16.7ms, p95 33ms frame
  intervals; this is a synthetic proxy, not physical laptop/GPU certification.
- **Focused tests:** 44 affected unit tests pass; final home/model checkpoint 35/35;
  browser suite 19 passed, 3 intentional skips. Full `npm run validate` passed: 534/534
  frontend tests, 532/532 backend tests, formatting, types, assets and production builds.
  Lint has zero errors and the same 13 existing warnings. Full `npm run e2e`: **236 passed,
  76 intentional skips, zero failures**, 8.7 minutes. Skips: 73 duplicate mobile axe cases,
  two mouse-only physics cases on touch and the duplicate mobile four-width headline check.
  Final formatting check also passed.
  Separate asset check passed: 401 files, 73 players, 45 marks, 1,257 matched team-seasons.
- **Independent review:** Impeccable finish disposition **ship**, no material fixes.
  Documenter confirms incumbent system preservation; no DESIGN.md/design.json or hook
  configuration changes. PRODUCT.md now persists explicit owner constraints and verified
  purpose, with unconfirmed audience/business fields left open.
- **Evidence:** [full report](docs/visual-polish/FINAL_POLISH_REPORT.md),
  [native screenshots](docs/visual-polish/screenshots/liquid-archive),
  [real motion sequence](docs/visual-polish/screenshots/liquid-archive/liquid-sequence.png),
  [motion measurements](docs/visual-polish/screenshots/liquid-archive/motion-checks.json).
- **Limits:** fixture player API and existing source-backed archives; production NBA
  connectivity and physical touch/GPU hardware not certified. Liquid approximates
  surface tension and droplet motion rather than solving full fluid volume conservation.
- **Boundaries:** no backend/contracts, global token, imagery/registry, other-page layout,
  dependency or deployment changes. Main/source UX branches untouched; no PR/merge/deploy.
  Raw NBA_ASSETS and local `.claude/` stay unstaged. Temporary review/first-pass captures
  are removed; all historical evidence from previous passes is preserved.

**Exact next action:** open `http://localhost:5173/history` for owner review. The existing
frontend and fixture backend remain running. Use `npm run dev` to restart if needed later.

---

## Previous homepage refinement handoff (preserved)

# Homepage refinement — latest handoff

17 October 2026 · `codex/nba-explorer-final-polish` · correction pass from `bfb241c`.
Resolve the delivery commit with `git log -1 --oneline` (the commit containing this update).
The prior cinematic-polish handoff remains below as history.

- **Four corrections implemented:** original home comparison appearance from `5cc481a`;
  homepage-only translucent charcoal search; slightly earlier hero mask/shade fade; 7px
  green core (30% smaller) inside the existing 10px halo footprint.
- **Fidelity:** all comparison geometry/styles match at four widths. Resting circle pixels
  are exact at 1920/1440/1024; mobile differs only at the screenshot crop/antialias level.
  Same Wembanyama/LeBron composition, typography, line breaks, copy and button. Kyrie stays
  in `/compare`. Hero source geometry and the approved smaller headline are preserved.
- **Physics:** `liquidModel.ts` unchanged; flat-red contour only while active, exact native
  CSS circle at rest. Stationary label; existing velocity/direction response and idle,
  offscreen, hidden-tab, touch and reduced-motion protections remain.
- **Status:** exact green and highlight, outer shadows, 20px ring and 2.8s animation retained.
  Only the centred solid core shrank. Connecting/unavailable logic is unchanged.
- **Affected files:** `home.css`, `LiquidVersus.tsx`, `FoundationPage.tsx`, `PlayerSearch.tsx`,
  `PlayerCombobox.tsx`; browser assertions and the dedicated capture script support QA.
- **Visual checks:** actual Chromium at 1920×1080, 1440×900, 1024×900 and 390×844; empty,
  focused, typed and results-open search; zero overflow or browser errors. Halo/ring
  measurements match before/after. Slow/fast mouse disturbance 37,981 / 202,056 in the
  focused run; label/heading/images fixed, exact recovery and idle pause verified.
- **Focused tests:** 31 unit tests passed; browser suite 13 passed, 1 intentional touch skip.
  Full `npm run validate` passed: frontend 527/527, backend 532/532, types, assets and
  production builds; lint has zero errors and the same 13 existing warnings. Separate
  asset check passed (401 files). Full `npm run e2e`: **230 passed, 74 intentional skips,
  zero failures**, 6.9 minutes. Skips: 73 duplicate mobile axe cases and mouse physics on touch.
- **Evidence/report:** [full correction report](docs/visual-polish/FINAL_POLISH_REPORT.md),
  [before/after/approved screenshots](docs/visual-polish/screenshots/home-refinement),
  [baseline measurements](docs/visual-polish/screenshots/home-refinement/baseline-comparison.json).
- **Limits:** fixture API/bundled archives; production NBA connectivity and physical touch/GPU
  performance not certified. Same surface-wave simulation. No new dependencies or application assets.
- **Git boundaries:** same feature branch; main and source UX branch untouched. No PR, merge,
  deployment or history rewriting. Existing `.claude/` and raw `NBA_ASSETS` stay unstaged.
  Correction committed and pushed on this feature branch; only pre-existing `.claude/`
  settings remain untracked. Temporary baseline source/junctions removed. No new hook
  suppressions; prior intentional
  side-accent exceptions remain unchanged.

**Exact next action:** owner reviews the four homepage corrections on this feature branch,
including gentle and fast mouse passes through the restored VS circle.

---

## Previous cinematic polish handoff (preserved)

# NBA Performance Explorer — final cinematic polish (latest)

Owner specification implemented on `codex/nba-explorer-final-polish`, based on the verified
`claude/nba-explorer-3-ux-polish` commit `5cc481ab8c3b94e02dcf990769d80c00fc3be881`.

- **Status:** READY FOR OWNER REVIEW. All eleven requests are implemented and verified, within the fixture/hardware limits below.
- **Verified implementation HEAD:** `07055db` (after checkpoints `2f3f3b3`, `fa81f34`, `cde9ed7`).
  The closing documentation/evidence commit is the final delivery HEAD; resolve it with
  `git log -1 --oneline`. No previous commit was rewritten.
- **Working tree:** tracked files clean after the closing documentation/evidence commit; feature branch pushed to `origin`.
  The pre-existing untracked `.claude/` settings are preserved. `NBA_ASSETS` is untouched.
- **Branch boundaries:** no changes to `main` or the source UX branch; no merge, deployment,
  force-push or pull request.
- **Full report:** [`docs/visual-polish/FINAL_POLISH_REPORT.md`](docs/visual-polish/FINAL_POLISH_REPORT.md).
- **Before/after evidence:** [`docs/visual-polish/screenshots/final`](docs/visual-polish/screenshots/final).
  Overview sheets cover 1920, 1440, 1024 and 390px widths. The original table-preview screenshots
  were captured from the actual archived baseline, with labelled layout fixtures.

## Completed owner feedback

1. Wembanyama image zoomed out; inset hard boundary eliminated and actual source edge feathered.
2. READ THE GAME. reduced exactly 4% across its responsive clamp, preserving font and motion.
3. Exact shorter homepage description supplied by the owner.
4. All thirty directory marks 62px instead of 48px, contained, with uniform card rows and name space.
5. Search controls share refined icon, surface and focus geometry; navigation, Arena and research
   sizes differ appropriately. Shortcuts and all combobox behavior remain.
6. Broadcast Scoreboard, inset archival History, diagonal rivalry Compare. Visible Pictured labels
   removed; subject metadata, source paths and existing image-rights documentation retained.
7. Brighter green service LED, larger halo and smooth ring; connecting/unavailable remain truthful.
8. Brand hover and keyboard feedback: short red underline, brighter NBA mark, no layout shift.
9. Genuine velocity-driven liquid VS boundary with directional impulses and local surface waves.
10. Compact court-based no-photo hero, including image failure recovery; photographic frame unchanged.
11. Seven-row game/career previews; no disclosure at seven or fewer, accessible expansion retained.

## Technical decisions

- No new dependencies or image files in the application asset registries.
- Liquid: 64-node Canvas 2D surface, neighbor tension, restoring pressure and damping. Swept pointer
  bounds include cursor jumps over the entire object. Separate HTML VS stays legible. Bounded
  integration and device pixel ratio; no idle/offscreen/hidden-tab loop; full listener cleanup.
- Reduced motion and touch use an attractive static circle. Canvas absence/failure also falls back.
- No-photo identity is selected strictly by the verified registry; real fixture player Terance Mann
  (`1629611`) demonstrates it. Desktop hero: 738px to 408px at 1440px. LeBron's photo hero stays 738px.
- Only the two existing player-table RowCollapse consumers receive the new seven-row default.
- Temporary baseline source and its junctions were removed after before-screenshot capture.
- Stop-hook triage: three baseline side accents are intentional command-palette/selection and
  qualified-peak cues. The hook CLI recorded only file-scoped `side-tab` exceptions in
  `.impeccable/config.json`; the follow-up detector is clear. UI and prior test results are unchanged.

## Verification

- `npm run validate`: exit 0. Formatting, lint (zero errors, 13 existing warnings), module casing,
  visual assets, TypeScript, frontend **527/527**, backend **532/532** and production builds pass.
- Final affected homepage/liquid unit suites after the cursor-jump correction: **15/15**.
- Broader focused physics/profile/table suites: **39/39**.
- `npm run check:visual-assets`: passes, **401 files**, **73 players**, **45 marks** and **1,257**
  name-matched team-seasons. Dependencies are unchanged.
- Full `npm run e2e` on `07055db`: **230 passed, 74 intentionally skipped, zero failed**, 7.3 minutes. Skips: 73 duplicate mobile axe cases and mouse simulation on touch.
- Actual console/HTTP audit on all eight key routes: zero errors.
- Raw logs: [`docs/visual-polish/verification`](docs/visual-polish/verification). Final formatting and lint also pass (the same 13 warnings).
- Eight required routes × four sizes: zero page overflow, broken loaded images or uncaught errors.
- Real browser checks cover search shortcuts and selection, brand feedback, service pulse, all
  thirty logos, no-photo/image failure, seven-row keyboard disclosures, slow/fast liquid swipes,
  recovery, idle pause, offscreen pause, reduced motion and the comparison CTA.

## Known verification limits

Browser runs use the existing explicit fixture provider and bundled archives. Long tables are
expanded, labelled DEMO fixtures; no real statistics were fabricated. Andre Turner's live response
and NBA.com production connectivity were not certified. The real no-photo example is Terance Mann.
The liquid is a surface-wave approximation, without detached droplets. Physical low-power GPU
and touch-hardware performance were not measured; touch uses the static fallback. Existing supplied
photograph reuse rights remain undocumented, as in the earlier handoff.

## Exact next action

Review this feature branch locally, starting with the homepage liquid VS and the before/after report.
For the same deterministic review environment in PowerShell:

```powershell
$env:NBA_DATA_PROVIDER='fixture'
$env:WIKI_ARCHIVE_MODE='bundled'
npm run dev
```

Open `http://localhost:5173`. The owner review is the next action; no merge or deployment is requested.

---

# NBA Performance Explorer — correction pass after live review (latest)

> Five small fixes from the owner's live review, on `claude/nba-explorer-3-ux-polish`. The 3.3
> handoff below still describes everything else.

## What changed

1. **Home comparison band reverted** to its layout before the Kyrie still was added: Wembanyama |
   VS | LeBron. The Kyrie-versus-defender still and its CSS are gone from the home page. The
   shorter copy and the condensed COMPARE TWO PLAYERS button stay.
2. **Kyrie matchup photo moved to the Compare page** (`/compare`).
   - It is the header photograph to the right of "COMPARE PLAYERS", masked into the charcoal on
     its left and lower edges, with a dark wash behind the title, a faint red floor light and a
     caption.
   - It uses the existing `kyrie-matchup` scene (640, 960 and 1536 px) with `srcSet`/`sizes`.
   - On phones it sits above the title.
   - The selectors are untouched and unobstructed (checked by hit-testing the input).
   - The head is a `div`, not a second `<header>` banner landmark.
3. **Search styling**, one system for the masthead control and the player search field (home
   hero, players page, comparison slots). Both are dark gradient fields with a soft hairline
   border, an inner top highlight and a small drop shadow.
   - **Masthead:** 38 px tall; red search icon; brighter label on hover; red ring and glow on
     focus. The "/" key is a keycap chip.
   - **Player field:** 50 px tall; roomier padding; lighter, calmer placeholder; red caret; hover
     border; red ring and soft glow on focus.
   - The Tailwind tone classes for the input were replaced by the shared `.searchfield` CSS in
     `shell.css`.
4. **Wembanyama zoomed out** in the home hero (desktop). The photo is drawn at 106% of its frame,
   shifted right, instead of 115%. About 84% of the photo's height shows, up from 77%, and his face
   stays clear of the headline. Mobile is unchanged.
5. **Status pulse stronger.**
   - The dot is a brighter green (#34d058) and 9 px.
   - Its glow swells from 6 to 12 px, and a soft ring expands and fades every 2.5 s.
   - No motion under reduced motion.
   - Connecting still shows a neutral ring; unavailable shows no dot.

## Verification

- **Static checks:** format, lint (0 errors, the same 13 warnings), module case and typecheck
  pass.
- **Visual assets:** the check passes (401 files).
- **Tests:** frontend **516/516** and backend **532/532**, in a full run after the final code change.
- **Build:** `npm run build` passes.
- **E2E (`npm run e2e`):** **217 passed, 0 failed**, 73 skipped (desktop and mobile, with axe).
  - This ran before the last code change, which turned the Compare page head from `<header>` into a
    `div`. That change only removes a duplicate banner landmark; AppShell's test caught it, and the
    affected suites pass 101/101 after the change.
- **Rendered checks** (headless Chromium at 1440 and 390 px, fixture backend):
  - The home band has only the two portraits.
  - The Compare page header photo loads the right variant, the Player A input is hit-testable, and
    there is no horizontal overflow.
  - The search fields' rest, hover and focus states are distinct.
  - The status dot runs both animations (glow and ring).

## Next step

Review the five fixes, then decide whether to open a pull request into `main`. The screenshots
are in `docs/visual-polish/screenshots`:

- `compare-page-after-*`
- `home-compare-after-1440`
- `home-hero-after-*`
- `search-and-status-states`

---

# NBA Performance Explorer — 3.3 UX polish handoff (live)

> Final state of the 3.3 polish. Read this first; the visual-assets handoff below it and the
> 3.2, 3.1 and 3.0 handoffs describe everything earlier. Full report with screenshots:
> [`docs/visual-polish/FINAL_POLISH_REPORT.md`](docs/visual-polish/FINAL_POLISH_REPORT.md).

- **Status:** ready for owner review, with the limitations below. Not merged, not deployed, no pull
  request.
- **Branch:** `claude/nba-explorer-3-ux-polish`, cut from `claude/nba-explorer-3-visual-assets` at
  `1a2bb9c` and pushed to `origin`. HEAD is the documentation commit that adds this text (see
  `git log -1`).
- **Working tree:** clean apart from local, untracked `.claude/` settings. `NBA_ASSETS` stays local
  and git-ignored; it was never modified.
- **Protected branches:** `main` (`cd557e4`) and the earlier branches are unchanged.

## Completed

| Work                                                                                                                                         | Commit        |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Collapsible game log and career table                                                                                                        | `8b90f93`     |
| Kyrie Irving: new profile photo; matchup photo reused (on the Compare page since the correction pass)                                        | `7184970`     |
| Kobe/Shaq season navigator header (`/history` index only)                                                                                    | `f54608c`     |
| Team directory plates (GSW collision fixed, about 13% wider, equal rows)                                                                     | `c714bbc`     |
| Masthead search refinement                                                                                                                   | `8c08edd`     |
| Kawhi Leonard buzzer-beater scoreboard header (`/games`)                                                                                     | `12c5cbf`     |
| Home: moving ribbon, TIP OFF close, green breathing status dot, hero type −4%, shorter comparison copy, condensed COMPARE TWO PLAYERS button | `b6c6ad7`     |
| Asset docs, polish report, screenshots and this handoff                                                                                      | final commits |

Nothing is deferred. Tasks 7–12, earlier reserved for Codex, are done in `b6c6ad7`.

## Assets changed

- **Kyrie Irving.** `NBA_ASSETS/NEWKYRIEPLAYERIMAGE.jpg` became
  `/images/players/action/irving-{640,960,1500}.webp`, his profile photo.
- **Scenes.** Three sources became section scenes. Their registry is
  `frontend/src/ui/sceneImageData.ts`, generated by the `SCENES` list in
  `scripts/assets/build_visual_assets.py`.
  - `NBA_ASSETS/UpgradedKyrie.png` → `/images/scenes/kyrie-matchup-{640,960,1536}.webp`.
  - `NBA_ASSETS/kobetoshaq…sectionimage.png` → `/images/scenes/kobe-shaq-{800,1200,1672}.webp`.
  - `NBA_ASSETS/buzzerbeater.webp` → `/images/scenes/kawhi-buzzer-{800,1280,1920}.webp`.
- **Docs updated.** `ASSET_INVENTORY.md`, `INTEGRATION_REPORT.md`, `IMAGE_QUALITY_AUDIT.md` and
  `asset-map.json` are current.

## Tests (final full runs)

- `validate`:
  - Format, lint (0 errors), module case, visual assets (401 files), typecheck and build pass.
  - Frontend: 516/516.
  - Backend: 531/532. One 20 s timeout under load; the test passes 8/8 alone, and there are no
    backend changes on this branch.
- e2e: 216 passed, 73 skipped, 1 failed. The failure is a desktop a11y contrast check on
  player-career, reported once under load; it passes 2/2 when run alone.
- `npm audit` and `npm audit --omit=dev`: 0 and 0 vulnerabilities.
- Production build (4310) and offline simulation (4320): 8 routes at 1440 and 390 px with no
  broken images, failed requests, external requests or overflow.

## Known limitations

- **Timing flakes.** Two tests can time out when the whole suite runs at once (see above). Neither
  is caused by this branch.
- **Fixture data.** NBA.com did not respond from this machine. Visual checks used the fixture
  backend, and the 74-game log was checked with fixture data enlarged in the page.
- **Image rights.** The scene photographs carry no supplied licence metadata. Publishing them is
  the owner's decision, as recorded in `docs/visual-assets`.

## Exact next action

Review `claude/nba-explorer-3-ux-polish` against the screenshots in `docs/visual-polish/screenshots`,
then decide whether to open a pull request into `main`.

---

# NBA Performance Explorer — visual assets handoff (live)

> The owner-supplied image library integrated on top of the 3.2 release candidate. Read this
> first; the 3.2, 3.1 and 3.0 handoffs below describe everything built before it.

- **Status:** READY FOR OWNER REVIEW, with limitations noted below. Not merged, not deployed, no
  pull request opened.
- **Branch:** `claude/nba-explorer-3-visual-assets`, cut from `claude/nba-explorer-3-expansion` at
  `0e184db` and pushed to `origin`.
  - Commits: `d132d5b`, `6664912` and the closing documentation commit (see `git log -1` for
    HEAD).
  - The protected branches (`main`, `codex/nba-explorer-2-engine`, `claude/nba-explorer-design`,
    `claude/nba-explorer-3-expansion`) were not touched.
- **Worktree:** clean apart from local, untracked `.claude/` settings. The raw `NBA_ASSETS`
  staging folder stays local; it is in `.gitignore` and was never modified.
- **Reports:**
  - [`docs/visual-assets/ASSET_INVENTORY.md`](docs/visual-assets/ASSET_INVENTORY.md)
  - [`INTEGRATION_REPORT.md`](docs/visual-assets/INTEGRATION_REPORT.md)
  - [`IMAGE_QUALITY_AUDIT.md`](docs/visual-assets/IMAGE_QUALITY_AUDIT.md)
  - before/after screenshots in [`docs/visual-assets/screenshots`](docs/visual-assets/screenshots)

## What changed

- **Photos replaced.** 11 of the 14 site photos were replaced by the supplied upgrades:
  Wembanyama (hero), Curry, LeBron, Giannis, Mitchell, Dončić, Jokić, Embiid, Harden, Leonard and
  Cunningham. Kevin Durant's upgrade was rejected for AI over-texturing; his sharper original is
  kept.
- **More players with photos.** 73 players now have images, up from 14: 15 editorial photos
  (Kyrie Irving is new) and 58 NBA.com headshots of current stars and 1980s–2010s legends.
- **Team marks.** All 30 current and all 15 historical marks are integrated, chosen by franchise ID
  and season and checked against the data's own team names. A season with no verified mark shows a
  neutral ring, never another era's brand.
- **One registry for each.** A single generated, ID-keyed player registry and a single
  season-aware mark registry feed these pages:
  - home, players landing, player heroes and record rooms;
  - scoreboard, game pages and standings;
  - team directory and team pages, rankings;
  - champions and awards, leaders, record book, leader movement and eras;
  - similarity, comparison, lineups and search;
  - bracket and film room.
- **Social preview and icons.** A social preview captured from the home page, and app icons from
  the existing mark.
- **New validate step.** `npm run check:visual-assets` checks files, sizes, orphans, metadata, and
  every mark era against 1,257 team-seasons of names.
- **Rebuilding.** `python -I scripts/assets/build_visual_assets.py [--skip-existing]` (Python 3
  with Pillow), then `npx prettier --write frontend/src/features/players/playerImageData.ts`.

## Verified state (final)

| Check                                                   | Result                                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm run validate`                                      | exit 0; frontend 508/508, backend 532/532, build passed                            |
| `npm run e2e`                                           | 217 passed, 0 failed, 73 skipped by design                                         |
| `npm audit`, `npm audit --omit=dev`                     | 0 / 0                                                                              |
| Production audit (port 4310)                            | 23 routes × 3 widths; no overflow, broken or enlarged images, no external requests |
| Offline demo (port 4320, all outbound requests blocked) | Every mark and face loads locally                                                  |
| Servers                                                 | All stopped at the end                                                             |

## Open decisions for the owner

1. **Publication.** No reuse permission is recorded for:
   - the NBA.com headshots;
   - the NBA and team marks;
   - the AI-upscaled editorial photos.

   They join the NBA.com data in the deployment runbook's §0 publication decision.

2. **Medium-confidence mark boundaries** (each falls back before its start), listed in the
   integration report:
   - Celtics 1998-99, Cavaliers 2022-23, Mavericks 2001-02, Pistons 1983-96, Pacers 2005-06;
   - Lakers 1983-84, Grizzlies 2004-05, Knicks 1992-93, 76ers 2015-16, Spurs 2002-03;
   - Jazz 2025-26 (the purple note supplied as current).
3. **Gaps you may want to fill.**
   - Marks of eras that were not supplied, which show neutral rings: Seattle 2001-08, Bobcats
     2007-14, New Orleans 2002-05 and 2007-08, Nets before 1997, and most 1980s–2000s marks.
   - Patrick Ewing's photo.
   - A larger hero source for 2× screens.

**Next action:** review the branch, in particular the screenshots and the Wembanyama hero. Then
decide on publication. To ship, merge `claude/nba-explorer-3-visual-assets` (it contains the 3.2
branch) through a pull request, as the deployment runbook describes.

---

# NBA Performance Explorer 3.2 — original specification completion handoff (live)

> 3.2 is the 3.1 release candidate plus the original-specification completion project on the
> same branch. Read this section first; the 3.1 and 3.0 handoffs below still describe what was
> built before.

- **Status:** READY WITH DOCUMENTED LIMITATIONS, awaiting the owner's review. Not merged, not
  deployed, no pull request opened; the public site still serves `main`.
- **Branch:** `claude/nba-explorer-3-expansion`. 3.2 commits: `68cc3c8` … `ecc5f3a` and the
  closing documentation commit (list in
  [`docs/expansion5/EXECUTION_LOG.md`](docs/expansion5/EXECUTION_LOG.md)).
- **Original specification:** 134 of 134 verified within stated scopes (3.1: 87 / 33 / 13 / 1).
  Evidence per row: [`FINAL_FEATURE_MATRIX.md`](docs/release/FINAL_FEATURE_MATRIX.md); summary:
  [`ORIGINAL_SPEC_COMPLETION_REPORT.md`](docs/expansion5/ORIGINAL_SPEC_COMPLETION_REPORT.md).
- **Data:** a digest-pinned NBA.com league archive (43 seasons, 1983-84 to 2025-26), live
  NBA.com sources on request, NBA.com's 2017-18 playoff shot zones, and award winners agreed by
  NBA.com and Wikipedia ([`DATA_INTEGRATION_REPORT.md`](docs/expansion5/DATA_INTEGRATION_REPORT.md)).

## Verified state (3.2 final)

- `npm run validate` exit 0: format, lint (0 errors, 13 baseline warnings), module-case,
  typecheck; frontend 488/488, backend 531/531; production build.
- `npm run e2e`: 217 passed, 0 failed, 73 skipped by design (mobile axe instances).
- `npm audit` / `--omit=dev`: 0 / 0.
- Production build on 4310: 70 routes at desktop and mobile width, only the expected
  bundled-mode awards and draft states. Offline simulation on 4320: every archive page works;
  live pages and the status board report NBA.com as unavailable.
- All servers stopped at the end.

## New in 3.2 (routes and endpoints)

| Route                                             | Endpoint(s)                                                                            |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `/standings?season=`                              | `GET /api/league/seasons`, `/standings`, `/standings/current`                          |
| `/leaders`, `/leaders/teams`, `/leaders/movement` | `/leaders`, `/team-rankings`, `/movement`, `/distribution`                             |
| `/teams/:id?season=`                              | `/teams/:teamId`                                                                       |
| `/games`, `/games/:id`                            | `/games`, `/calendar`, `/snapshot`, `/games/:id`, `/games/:id/play-by-play`, `/status` |
| `/history/record-book`                            | `/records`                                                                             |
| `/history/eras`                                   | `/eras`, `/era-players`, `/player-search`                                              |
| `/history/champions`                              | `/honours`                                                                             |
| `/players/:id/records`                            | `/players/:playerId`                                                                   |
| `/lab/lineups/nba`                                | `/lineups`                                                                             |
| `/lab/shots` (league columns)                     | `leagueBaseline` in `GET /api/shots`                                                   |

Rebuild scripts (run by hand only, spaced and cached): `build-league-archive.ts`,
`build-league-extras.ts`, `build-league-honours.ts`; `reconcile-boxscorelab.ts` repeats the
cross-check against local CSVs that are never committed.

## Open decisions for the owner (3.2)

1. **Publication of NBA.com-derived data.** Used under the owner's accepted risk; no licence is
   held. Decide before merging whether the public site ships it
   ([deployment runbook §0](docs/release/DEPLOYMENT_RUNBOOK.md)).
2. **Render availability of NBA.com.** The live features have not been checked from a cloud
   host.
3. **Eddie Johnson, 1988-89 Sixth Man.** NBA.com lists no awards for him, so the award is shown
   as a gap; adding it would need a second source the owner accepts.

---

# NBA Performance Explorer 3.1 — completion sprint handoff (live)

> 3.1 is the 3.0 release candidate plus an overnight completion sprint on the same branch. The
> 3.0 handoff below still describes everything built before 3.1; read this section first.

- **Status:** READY WITH DOCUMENTED LIMITATIONS, awaiting the owner's review. Not merged, not
  deployed, no pull request opened; the public site still serves `main`.
- **Branch:** `claude/nba-explorer-3-expansion` (no new branch). 3.1 commits: `f05fb89`,
  `8c6e5b5`, `ca601e3`, `4d62922`, `46d69ad`, `969873e`, `f06e68f`, and the closing
  documentation commit.
- **Evidence:** [`docs/expansion4/VERIFICATION_LOG.md`](docs/expansion4/VERIFICATION_LOG.md),
  [`GAP_CLOSURE_PLAN.md`](docs/expansion4/GAP_CLOSURE_PLAN.md),
  [`DATA_SOURCE_AUDIT.md`](docs/expansion4/DATA_SOURCE_AUDIT.md) and the updated
  [`FINAL_FEATURE_MATRIX.md`](docs/release/FINAL_FEATURE_MATRIX.md) (87 / 33 / 13 / 1 of 134;
  3.0 was 83 / 37 / 13 / 1).

## Completed in 3.1

| Commit    | Scope                                                                                                                |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| `f05fb89` | Live Wikipedia parsing fixed after the parse API switched to Parsoid links (awards and draft returned 502 live)      |
| `8c6e5b5` | P0: game research defaults to the latest season; film room save keeps the game; story embeds paced; test reliability |
| `ca601e3` | Gap-closure plan formatting                                                                                          |
| `4d62922` | Data Coverage Explorer `/explore/coverage` and `GET /api/coverage` (H11, I11)                                        |
| `46d69ad` | Source-listed position filters on recorded leaders and Workbench cohorts (E08, H05)                                  |
| `969873e` | BoxScore Lab audit: data quality passes, licence fails, not integrated                                               |
| `f06e68f` | Totals panel test renders inside a router (regression from the coverage link, caught by the full run)                |

## Verified state (3.1 final)

- `npm run validate` exit 0: format, lint (0 errors, 13 baseline warnings), module-case,
  typecheck; frontend 457/457, backend 468/468; production build.
- `npm run e2e`: 172 passed, 0 failed, 58 skipped by design (mobile axe instances).
- `npm audit` / `--omit=dev`: 0 / 0.
- Production build on 4310: 55 routes audited at desktop and mobile width (bundled and live
  archive modes); awards and draft answer live; offline simulation on 4320 verified (19 routes).
- Servers: the presentation server was stopped at the end of the sprint.

New in 3.1: `GET /api/coverage` (no parameters); `position=G|F|C` on `/api/recorded/leaders` and
`/api/recorded/workbench` (players only); leader rows carry optional `positions`; responses
carry `positionUnlistedPlayers` and, when filtered, `positionScope`. Saved-research paths allow
`/explore/coverage`.

## Open decisions for the owner (3.1)

1. **Roster identity refresh.** Live team pages now add article URLs for 8 teams' rosters that
   the snapshot has as null. A re-snapshot with `backend/src/scripts/build-recorded-snapshot.ts`
   would change identity and cohort counts, so it was not done during the sprint.
2. **BoxScore Lab.** Integrate only with written confirmation that NBA Stats data may be
   redistributed (see the audit, §5).
3. **Optional features not started** (P3): Time Machine, player evolution, rivalry view,
   advanced shot comparison, reader-weighted similarity. None was begun, by design.

---

# NBA Performance Explorer 3.0 — release candidate handoff

> The handoff for the 3.0 expansion. The 2.0 redesign handoff and the original Codex
> engineering handoff follow below unchanged and stay authoritative for their scope.

- **Status:** release candidate, **READY WITH DOCUMENTED LIMITATIONS**, awaiting the owner's
  review. Not merged, not deployed: the public site still serves `main` (`cd557e4`).
- **Start here:** [`docs/release/RELEASE_READINESS.md`](docs/release/RELEASE_READINESS.md), then
  [`DEMO_RUNBOOK.md`](docs/release/DEMO_RUNBOOK.md),
  [`DEPLOYMENT_RUNBOOK.md`](docs/release/DEPLOYMENT_RUNBOOK.md),
  [`FINAL_FEATURE_MATRIX.md`](docs/release/FINAL_FEATURE_MATRIX.md) and
  [`PRODUCT_OVERVIEW.md`](docs/release/PRODUCT_OVERVIEW.md).
- **Branch:** `claude/nba-explorer-3-expansion`, cut from the approved 2.0 checkpoint `0aa2717`.
  Never commit to `main`, `codex/nba-explorer-2-engine` or `claude/nba-explorer-design`; no
  merge or deploy without the owner (the runbook describes a squash merge).
- **HEAD:** see `git log -1`; every verified stage commit is listed below.
- **Working tree:** clean after each commit (a local, untracked `.claude/launch.json` preview
  config may exist on the development machine; never commit it).
- **Evidence:** `docs/expansion3/VERIFICATION_LOG.md` (per-stage results) and
  `docs/expansion3/FEATURE_INVENTORY.md` (inventory and backlog).
- **Design:** the Arena & Film Room system is final. New modules reuse its tokens, slates,
  tapes, scoreboard/statgrid/ladder modules and motion primitives; new CSS lives in
  `frontend/src/design/intel.css` and `playoffs.css`, with additions in `studio.css` and
  `history.css`.

## Completed in 3.0

Session one (`fd2d2c0` … `b96e4d4`): security (16 → 0 audit findings), team season intelligence,
standings race (three views), 2024 bracket with published seeds and series context on game
pages, Shot Studio distance/zone/efficiency/saved views, player hub "2023–24" room with similar
seasons, two-team duel, search over archive players, My NBA research board with notes, Formula
lab, 2023–24 season hub, team wall records and the homepage "New in the film room" band.

Session three — finalization (`50d4b90` … this commit):

| Commit    | Scope                                                                                 |
| --------- | ------------------------------------------------------------------------------------- |
| `50d4b90` | Playoff Series Film Room `/games/series/:id`; committed playoff/season table snapshot |
| `e062351` | Statistical Story Builder `/my-nba/stories` (editor, reader/print, JSON, share link)  |
| `bbb7ca1` | Spec gaps: series/game search, leader player links, comparison CSV/SVG; `/tour`       |
| `93499a5` | Team panel snapshot fallback; `scripts/start-presentation.ps1` and stop script        |
| final     | Release docs, matrix, README, screenshots, player error copy, test timeouts           |

New in session three: `GET /api/games/series/:seriesId`; `WIKI_ARCHIVE_MODE=live|bundled`;
`backend/src/features/wiki-archive/archive-snapshot.json` (rebuild with
`npx tsx backend/src/scripts/build-archive-snapshot.ts --write`); stories in browser key
`nba-explorer.stories.v1`; saved-research paths allow `/games/series/:id`.

Session two (`a1c672b` … `7b56586`):

| Commit    | Scope                                                                          |
| --------- | ------------------------------------------------------------------------------ |
| `a1c672b` | Efficiency view recoloured by points per attempt (FG% misled on threes); tests |
| `e8cd484` | e2e covers the efficiency view; full run 142 passed, 0 failed                  |
| `c3e241c` | 2022-23 audited and **not ingested** (10/30 clean pages); season-aware parser  |
| `c8a1b99` | Research Workbench `/lab/workbench` (players/teams, rank/distribution/relate)  |
| `682de4d` | Comparison Studio `/compare/recorded`: gap board, statements, exact values     |
| `45c495c` | Shot Studio court region: drag or numeric bounds, URL, outline, exports        |
| `2d22dc0` | My NBA collections: tag, filter, rename, dissolve, export one collection       |
| `899801f` | Similarity Finder `/discover/similar` on 2–9 reader-chosen measures            |
| `7b56586` | Workbench: furthest above and below the fit line (residuals)                   |

New APIs this session: `GET /api/recorded/workbench`, `/api/recorded/player-comparison`,
`/api/recorded/similarity`; `/api/shots` accepts `region`. Contract changes: density cells gain
`pointsPerAttempt`; shot responses carry `region`; bookmarks gain optional `tags`; recorded
contracts use `RecordedSeasonSchema` (still `['2023-24']`). Saved-research paths now allow
`/discover/similar`.

## Verified state (final)

- Format, lint (0 errors, 13 pre-existing warnings), module-case, typecheck: pass. Frontend
  448/448, backend 457/457, production build: pass.
- `npm run e2e`: 169 passed, 0 failed, 57 skipped by design (desktop-only axe), desktop and
  mobile.
- Production build served locally; 20 routes refreshed with all external browser requests
  blocked; offline simulation of the server verified (see the demo runbook for what works).
- `npm audit` and `npm audit --omit=dev`: 0 vulnerabilities.
- On this host, full runs can fail by timing alone under heavy load; tests now wait longer
  (async 4 s; frontend 15 s and backend 20 s per test). No assertion was weakened.

## Constraints and data notes

- NBA Stats timed out from the development machine in sessions one and two and answered at the
  final session-three check (send the app's own headers; a bare curl times out). New work uses the
  committed recorded archives and the committed playoff snapshot. Quarantined games keep their slot but never get
  a score. Rest, streaks and rolling margins are withheld when chronology is unknown.
- Bracket winners require a fourth win in the series' last recorded game; rounds are derived
  from team series order and cross-checked against NBA game-ID round digits. Seeds come
  only from the published series headings and are accepted only when consistent.
- Similar seasons are equal-weight z-score distance in a stated cohort; the UI calls them a
  resemblance, never a quality judgement. Recorded leaders use the archive's games rule, not the
  official one, and say so.
- Tests that were re-expressed (never weakened) are listed in the log: the Shot Studio title
  count and the search "warriors" option.
- Commits carry no AI co-author trailer (owner preference).
- npm 10.9.3 crashes on `npm update` (arborist edgesOut); use `npx npm@11 update <pkg>` for
  targeted updates, then `npm ci` with the project npm.

## Next actions (in order)

1. **Owner:** run `scripts/start-presentation.ps1`, follow the 7-minute route in the demo runbook,
   and read `RELEASE_READINESS.md`.
2. **Owner:** open a pull request into `main`, wait for CI, then squash merge when satisfied
   (`DEPLOYMENT_RUNBOOK.md`); verify NBA.com availability on Render afterwards.
3. Later engineering (not needed for release): reader-weighted similarity and similar team
   seasons; a field-by-season coverage explorer (H11/I11); re-audit 2022–23 if Wikipedia's team
   pages are repaired (parser and audit script ready).

Continuation: `git checkout claude/nba-explorer-3-expansion && npm ci && npm run validate`.
For live checks run the backend on 3001 (`PORT=3001 npm run dev:backend`) and the frontend with
`npm run dev:frontend`; `npm run e2e` reuses those servers.

---

# Shot 2 — Arena & Film Room redesign (Claude design branch)

> This section is the live handoff for the redesign. The engineering handoff below it is the
> original Codex closeout and stays authoritative for the engine, sources and contracts.

- **Branch:** `claude/nba-explorer-design`. The engineering baseline is `b4e5f88`.
  - The original history is preserved; never rebase, reset or rewrite it.
  - Never commit to or merge into `main`. Nothing has been deployed.
- **Approved direction:** A, Arena & Film Room. B and C were rejected visually. C's linked
  charts, brushing and filtering are reused in A's language only.
- **Evidence:**
  - `docs/redesign/VERIFICATION_LOG.md` holds per-stage results, test re-expressions and the
    bundle record.
  - `e2e/` holds the Playwright smoke and axe suites. Run them with `npm run e2e`, which needs
    `npm run dev` with ports 5173 and 3001 free.

## Stage status

| Stage | Scope                                                                        | Status |
| ----- | ---------------------------------------------------------------------------- | ------ |
| 0     | Baseline, harness, dependencies                                              | Done   |
| 1     | Tokens, fonts, motion system, primitives, chart kit                          | Done   |
| 2     | Global shell: masthead, nav, search, footer, Film Room frame, 404            | Done   |
| 3     | Player hub (overview, form, games, career, shooting), Recharts removal       | Done   |
| 4     | Shot Studio (court, dots/density/zones, linked table, export by stable ref)  | Done   |
| 5–8   | Compare suite; teams/games/standings/leaders; seasons/history; labs          | Done   |
| 9     | Homepage, landings, My NBA motion setting, "What's on tape" coverage page    | Done   |
| 10    | Route sweep, keyboard walkthrough, transform-only audit, copy, bundle record | Done   |

The redesign scope is implemented and verified across all 39 route examples (35 route
templates plus home, landings and the catch-all).

Final verified state:

- `npm run validate` exits 0: 347 frontend and 413 backend tests pass, lint has 0 errors, and
  typecheck and builds pass.
- Playwright passes 118/118. Smoke passes 78/78 on desktop and phone. Axe passes 40/40
  scans (39 routes plus the homepage loading state) with zero serious or critical
  violations.
- Initial JS is 196.5 kB gzip, against 235.2 kB at baseline.

## Continuation instructions

1. Check out `claude/nba-explorer-design` with a clean `git status`.
   - Run `npm ci` if `node_modules` is missing.
   - `npm run validate` must pass before and after any change.
2. The building blocks live in `frontend/src/{design,motion,ui,charts}`.
   - Research pages render inside `ResearchShell`, which provides the `.fr` Film Room scope.
   - Arena moments use `KineticHeadline`, `Reveal` and `Stagger`.
   - Chart marks animate from `useSeen()`, which reports true at once when motion is off.
3. Keep accessible names and copy that tests pin; see the test re-expressions in the
   verification log.
   - Re-express colour or geometry assertions as `data-*` hooks rather than deleting them.
   - Never add URL params outside the backend contracts.
4. Module names must not differ only by case. `court.ts` (geometry) and
   `BasketballCourt.tsx` (component) once shared the stem `Court`/`court`, and that blanked
   the app on Windows. `npm run check:module-case`, part of `validate`, fails on any such
   collision and on any import that resolves differently on a case-insensitive filesystem.
5. Run Prettier from the repository root (`npx prettier --write <paths>`). Run from a
   workspace folder, it misses `.prettierignore` and reformats the immutable
   `lineup-study-snapshot.json`.
6. Animate only `transform` and `opacity`, and never set React state per frame. Use motion
   values for scroll and pointer effects.
7. After each change, append its results to the verification log. Commit with the session
   trailers and push with `git push -u origin claude/nba-explorer-design`.

## Known limitations and open items

- **Initial focus.** Every page focuses its `h1` on entry, including the first load. This is
  an inherited contract pinned by baseline tests. The skip link and masthead are therefore
  reached with Shift+Tab from the heading.
- **Peak-season picker.** Its summary still reads "Choose a qualified peak season for NBA player
  {id}". A test pins the text verbatim, so it should be changed only together with that test.
- **Backend copy.** The run-together spacing defects are fixed. Beyond that, some engine copy
  stays dense ("regular finals", slash lists) and was left for its owners.
- **Demo-mode career data.** The fixture provider has no career raw totals, so career curves
  and career tables are empty in demo mode. This is a data limit; the page says so.
- **Search focus test.** The handoff of focus to the destination after a search choice is
  verified in Chromium only. jsdom skips the exit animation, so it cannot reproduce that
  ordering.
- **CSS size.** CSS grew from 8.8 kB to 23.7 kB gzip, the cost of the design system.
- **Lint warnings.** Lint reports 13 react-refresh warnings for modules that export constants
  alongside components. There are no errors.
- **Production checks.** Production-host reachability and deployment are not verified, and are
  not authorized on this branch.
- **Fixed: Windows startup failure.** The app was blank on Windows at `436cb60`, caused by
  `charts/Court.tsx` sitting beside `charts/court.ts`. It is fixed by renaming the
  component to `BasketballCourt` and is guarded by `check:module-case`. Details are in the
  verification log's hotfix entry.
- **Cold-start preview race.** Opening the homepage before the backend listens can leave the
  game preview saying its archive is unreachable until a reload. The page itself renders.
- The motion preference, item L10 in the Codex ledger, is now delivered on My NBA.

---

# NBA Performance Explorer 2.0 — Engineering Handoff

## Snapshot timestamp / branch / HEAD / base commit

Closeout completed on 2026-10-15 Australia/Sydney. Branch `codex/nba-explorer-2-engine`. Validated engine HEAD: `2561a17a2700b6f14fbed2cac727acfac1b09fdd`; the final documentation commit follows that checkpoint. Resolve the actual checkout HEAD with `git rev-parse HEAD`; the delivery report gives the final documentation SHA. Protected baseline: `cd557e4d3cf75e44f930ba75de4ea149a80ccdda`.

## Working tree and pending changes

All engineering changes are committed. Final documentation and audit evidence are the only changes being sealed by the closeout commit; no unfinished feature implementation remains. Confirm `git status --short` on receipt: the final delivery checks it after committing. Ignored local validation logs are not required for Cloud. No reset, discarded source work, stash, merge, push or deployment was performed.

## Goal and non-negotiable constraints

Shot 1 feature expansion is officially closed. This is the stable foundation for Claude Code Cloud Sessions to design and implement approved Shot 2 frontend work through GitHub. Do not resume old expansion instructions in the archived journal/master specification. Preserve source contracts, calculations, qualification, missingness, provider boundaries and attribution. No invented statistics, required paid services, restriction bypass or unapproved production action. Original visuals remain protected until the owner approves specific Shot 2 changes.

## Verified baseline and last validation results

`npm run validate` PASS after the final SVG repair: 737 tests, comprising 324 frontend tests in47files and413backend tests in41files; all formatting, lint, typechecks and production builds pass. Original434tests remain. No tests were removed or timeouts weakened. Frontend two-worker cap remains; the new team test preloads its subject before assertion timers to avoid cold module compilation affecting UI timing.

Genuine local evidence: `npm run smoke:engine` PASS16reads; `npm run smoke:closeout -- --write-report` PASS87reads (46contractAPIs,36SPArefreshes,5invalid/methodcases), realCSVcontent and exact source/dist asset hashes. Genuine shotSVG metadata/XML-reopen PASS. All35registered route templates plus home rendered in bounded browser checks. Reports are committed under `docs/expansion/CLOSEOUT_*`.

## Completed commits and shipped-on-branch vertical slices

All historical branch checkpoints remain intact. Last prior checkpoint5810907 delivered common-cohort profiles. Closeout commits:

- `121d4baf683e2286a9400bf0ae0d92a27db61853`: finished historical team rankings/splits, source-backed conference facts, source capability reporting, tests and bounded genuine acceptance harness.
- `2561a17a2700b6f14fbed2cac727acfac1b09fdd`: fixed invalid SVG duplicate namespace declarations and strengthened XML-reopen tests/evidence.
- Final documentation commit: this handoff, complete Claude inventory/setup, source notices, release notes, accurate134-item ledger and preserved archives. Its SHA is resolved from Git and reported at delivery.

Working modules include explorer; player rolling/split/raw/career/shooting research; selected/career/normalized comparisons; historical teams/results; playoff games/quarters; standings/leaders/recorded rankings; historical facts/awards/draft/records/calendar/progression; genuine shot maps/density/shooting tables; research lineup time/PM; discovery; local favorites/named links/preferences/recent history. Every route/control/source limit is listed in DESIGN_HANDOFF_FOR_CLAUDE.md; all public APIs in API_CATALOG.md.

## Current milestone and exact in-progress task

Engineering closeout is complete. There is no next feature implementation. Publish only the completed development branch **after explicit owner approval and watched-branch review**, then let Claude inspect the repository and propose supervised Shot 2 design. Production release is a later, separately authorized audit.

## Feature ledger summary (counts by status)

Exactly134requirements: **77VERIFIED,41PARTIAL,14BLOCKED,2DEFERRED**. All master IDs match one-for-one; machine-readablecounts in CLOSEOUT_FEATURE_COUNTS.json. Six earlier verified claims were reduced (A10,B10,B13,C08,F10,H11). Upcoming/current league capabilities A05/A08 are blocked. I06 historical franchise mapping is deferred because a permitted candidate exists but was not integrated; L10 motion preference is deferred. Verified means the complete behavior within its stated supported scope, not comprehensive/current/all-time NBA coverage.

SHOT_1_ENGINE_STATUS=WORKING_BUT_INCOMPLETE. READY_FOR_CLAUDE_DESIGN=YES for supervised work on the stable existing engine; this does not certify all module minimums or production readiness. D full match center and E current/full league remain incomplete; broader historical/lineup/era scopes remain limited.

## Data sources (verified, conditional, blocked, rejected)

- Existing NBA.com four endpoint families preserved; genuine local engine flows passed. Network availability, empty rows, broad source rights and actual Render/Cloud access remain conditional.
- Wikipedia CC BY-SA4.0: fixed2023-24league/team tables,2024playoff finals,2023draft; exact revisions/contributors/licence/adaptation notices. Wiki client uses33allowedtitles,10s/2MB/24hboundedcache/Retry-After, no retries.
- WikidataCC0: historical season/champion facts and exact article/NBA-ID enrichment; missing facts/modern franchise labels remain explicit, no fuzzy mapping.
- Genuine recorded2023-24archive:30sources,639regularrows/29scopedteams,18Chicago unknown-scope rows;1219agreedfinals/nineconflicts/twounpaired quarantines; common363GP20defaultcohort, not complete league.
- BoonP/KaggleCC0:13,470attempts/6143makes/203players/16teams/80games, partial2018playoffs. Original CSV/hash, geometry and licensing preserved.
- ArnaudOdet/DataverseEtalab2 author-derived2017-18research:13,867groups/1229games/540nativeBRIDs; one missing-period game/two exclusive groups quarantined. No rawPBP/code/pickle reuse, guessed NBA IDs or possession ratings.
- Broad NBA/CDN/ESPN/PBP routes remain rights/input blocked. MIT libraries do not license upstream datasets. No automatic fixture substitution, evasion, paid database or scheduler.

## Architecture and important decisions (with file pointers)

App.tsx registers additive lazy routes; original render trees/assets/provider remain unchanged. ResearchShell/research.module.css provide separate scoped UI. Shared Zod contracts in packages/contracts validate boundaries. Backend app/server compose independent optional providers; research services own raw math/source budget; recorded providers reuse immutable data and paired-game reconciliation. Frontend math helpers remain outside visual rendering. Local My NBA uses versioned internal URLs, strict caps, session recovery and separate opt-in recent key. Full architecture/styling/component inventory and data invariants are in the Claude handoff; operational details in OPERATIONS.md.

## Files changed in current work session

Interrupted team feature contracts/provider/router/UI/tests and source conference JSON; app capability plumbing/explorer text; SVG export helper/regression; opt-in smoke-closeout.ts/root script; final genuine/browser/export/count reports. Documentation: rootHANDOFF, README, architecture/state/decisions, all essential expansion audit/catalog/calculation/source/operations/design/release/verification documents. Original journal preserved in SHOT1_EXECUTION_JOURNAL.md and original specification in SHOT_1_MASTER_SPEC.md, explicitly marked archival/superseded.

## Tests and exact commands/results

- `npm run validate`: final PASS737, including final SVG namespace regression.
- `npm run smoke:engine`: PASS16genuine local reads and raw formula/rolling/comparison checks.
- `npm run smoke:closeout -- --write-report`: PASS87bounded genuine API/SPA/error/hash/CSVchecks after the production build.
- Focused team suites:4backend/3frontend cases PASS; source capability regression included in21-case suite PASS; shot UI/export suite5cases PASS.
- Literal Node ESM/jsdom genuine SVG check:261Curryfilteredattempts/hash/licence metadata and validXML PASS; no browser download wait.
- `git diff --check`: PASS.134uniqueledger IDs match archivedspec exactly; documentation links checked. Protected paths have no diff againstcd557e4.
- Local production config starts with NBA genuine provider, fixtures forbidden and builtSPA; actual host/remoteCI not tested or deployed.

## Known bugs, security concerns and reliability limitations

No confirmed unresolved critical calculation, route or export bug after closeout. Genuine checks found and repaired team frontend query mismatch and duplicateSVGxmlns. A few ad-hoc harness/selector/quoting mistakes were corrected without weakening application checks, and are recorded in VERIFICATION_LOG.md.

Release risks: production-host/Cloud egress, cold starts and memory remain unverified; local server working set128.7MB after genuine flows is not cloud certification. Original shared/Recharts646KBchunk warning remains. No public rate limiter or durable server cache added. Immutable integrity-checked asset corruption intentionally prevents startup. Historical cohorts are incomplete, not live/official; research lineups are reconstructed and lack possessions/on-off. Original masthead anchors/footer/metadata retain static live branding and need approved design integration. No same-fixture pixel equality test.

## Protected original UI baseline and visual check status

Original protected frontend files/assets/metadata/screenshots, originalbackendplayers andrender.yaml diff is empty againstcd557e4. Original tests remain. Actual original home/profile/compare and all expansion templates rendered at390x844; document375px/controlsfit/tablecontainersscroll. Default desktop width1280/document1265 tested for final team navigation. Viewport reset. ORIGINAL_VISUAL_DESIGN=unchanged_diff_only; no pixel-equality claim or redesigned baseline.

## Next task queue (ordered)

1. Owner confirms Render watchedbranch will not auto-deploy the developmentbranch, approves publication and executes the explicit safe branch commands in OPERATIONS.md.
2. Review GitHub CI, grant Claude Cloud repository/branch access; start a separate Shot2branch.
3. Claude reads this file and DESIGN_HANDOFF_FOR_CLAUDE.md, runs validation, inspects real supported pages and proposes designs for human approval.
4. Implement only approvedfrontendwork, preserving engine contracts/math/source/coverage and protected originals until specific approval.
5. Separately authorize future production release validation. Do not restart deferred source expansion during design.

## Single NEXT ACTION

Review `docs/expansion/DESIGN_HANDOFF_FOR_CLAUDE.md`, then approve development-branch publication only after confirming Render’s watchedbranch. No push command has been executed.

## Continuation prompt for a new Codex session

Shot1isclosed. Read currentGit,HANDOFF,FEATURE_LEDGER,Claudehandoff and source notices. Preserve the validated engine and all progress. Do not resume archived feature queues, redesign protected pages without approval, invent data, spend money, merge, push or deploy. ClaudeCloud owns supervisedShot2design/approvedfrontendimplementation on the published developmentfoundation; execute only the owner’s next explicit task.
