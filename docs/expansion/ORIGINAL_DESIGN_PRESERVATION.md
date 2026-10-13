# Original design preservation

Baseline `cd557e4d3cf75e44f930ba75de4ea149a80ccdda`. Protected routes `/`,
`/players/:playerId`, `/compare` and legacy catch-all behavior.

Protected files: AppHeader.tsx, AppFooter.tsx, AppRoot.tsx, styles.css,
foundation, players, player-comparison and player-search feature trees, metadata,
fonts, images and `docs/assets/*`. Only additive route registration in App.tsx
is expected. No old visual file edit is permitted for this task.

No screenshot comparison has been performed in this session. Existing screenshots
are reference assets, not proof of new pixel comparison. Baseline validation pending.
