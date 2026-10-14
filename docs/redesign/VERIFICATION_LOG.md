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
