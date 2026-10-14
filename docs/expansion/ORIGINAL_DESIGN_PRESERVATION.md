# Original design preservation

Base: cd557e4d3cf75e44f930ba75de4ea149a80ccdda. Original routes `/`,
`/players/:playerId`, `/compare`, and legacy catch-all FoundationPage retained.

No diffs to AppHeader, AppFooter, AppRoot, styles.css, foundation, players,
player-search, player-comparison feature trees, browser metadata, fonts/images,
player-image registry, docs/assets, render.yaml or package-lock.json. Checked with
`git diff cd557e4 --name-only -- <protected paths>`, returning no paths. App.tsx
changes are additive lazy/Suspense route declarations; original render trees and
route elements unchanged. New CSS selectors belong to a separate CSS module.

All 190 original frontend and 244 original backend tests remain and pass. New
functional tests add no rewritten visual snapshots or deleted legacy assertions.

Browser: Codex in-app browser, genuine local NBA mode at localhost:3002. Original
home search → Curry profile and season switch; original two-player compare direct
URL and refresh inspected. Native screenshots of old home and comparison at
664x704 were emitted in this chat. No page overflow observed at that viewport.
New insights at 664x704 and analytics at 390x844 also inspected; mobile exact-value
table has its own accessible scroll region and ArrowRight moved it 39.5 pixels.
Temporary viewport override reset. No new screenshot files saved.

No before/after same-fixture/same-viewport pixel comparison performed. Existing
baseline images were not overwritten. Status: unchanged_diff_only, supported by
source diff and legacy tests plus current manual views, not a pixel-equality claim.
The preserved masthead's home anchors and static footer branding need Shot 2
integration for new routes; local new-page navigation/source labels are provided.

## Resumed career additions

Only additive lazy App routes, new research pages/components and links within expansion pages. Original header/footer/home/profile/comparison render trees, global styles/assets/metadata/provider remain unchanged. Native SVG curves are confined to the new career page with equivalent accessible tables. No original design-system replacement.

## Raw-game and postseason checkpoint (2026-10-14)

Postseason/raw-game slice changes only expansion components/contracts/providers and app/server composition. Protected original frontend source, assets, deployment manifest, lockfile and original backend PlayerProvider remain untouched. Mobile new-table containment verified independently; no redesign.

## CC0 history and qualification checkpoint (2026-10-14)

History adds two lazy routes and local research navigation only. Original header/footer/home/profile/comparison/global styles/assets/providers/deploy manifest remain unchanged. CC0 source carries no borrowed NBA imagery.

## Usage-limit resume verification (2026-10-14)

Age/stints/recency are expansion-only. Worker scheduling changed; protected original visual source/assets/global CSS/provider remain untouched. Subsequent Wikimedia work adds a free parser runtime dependency, so the original lockfile preservation statement applies only to earlier checkpoints.

## Historical archive checkpoint

Only additive App routes and new/research components changed. Existing NBA PlayerProvider, home/profile/compare UI, masthead/footer, global CSS, public assets/metadata and Render configuration remain unchanged. One free runtime HTML parser adds intentional package/lockfile changes; lockfile preservation statements apply to prior checkpoints. No images or prose imported.

672-test analytics checkpoint: protected original frontend paths/assets/provider/render configuration have an empty diff against baseline cd557e4d3cf75e44f930ba75de4ea149a80ccdda. Browser QA confirms3 rendered analytics SVGs/363 dots/table and actual target. No pixel comparison claim.

Shot milestone: protected original frontend components/styles/assets/legacy provider/render paths remain empty diff against baseline. Mobile repair changes only existing expansion research.module.css wrapping and label containment. Source CSV is numeric data, no original asset/image replacement. Genuine browser actual marks/table verified; no pixel comparison claim.

Discovery/calendar checkpoint adds lazyplainroutes and scopedfunctionalforms/tables. Protected originalpaths/assets/provider/render remain empty diff vs cd557e4. No original style/interaction redesign or production deployment.

Historical awards/progression adds only lazy research routes/forms/scoped SVG tables and independent providers. Protected original frontend paths/assets, existing NBA provider and render configuration remain unchanged versus baseline cd557e4. No image or media reuse, global styling redesign, push or deployment.
