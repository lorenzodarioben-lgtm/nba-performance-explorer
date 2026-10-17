# NBA Performance Explorer 3.3 release candidate

Design finalized; not merged or deployed by this release-preparation task.
Approved application baseline: `8e2b38b6b3c5569c2700cd041bcb9b6d0e3818ce`.

- Player profiles, season statistics, career trends, game logs, shooting and research rooms.
- League archive from 1983-84 through 2025-26, with season-aware teams, standings,
  leaders, records, eras and documented coverage gaps.
- Team directory, franchise/season views, source-backed historical season navigation,
  champions, awards, drafts and the recorded playoff film room.
- Scoreboard schedule, game detail, box scores and play-by-play when NBA.com supplies them.
- Player comparisons, comparison studio, career curves, similarity, workbench, Shot Studio,
  lineups, formula and statistical research tools within each source's stated coverage.
- Player/global search, My NBA saved research, collections, stories and validated local
  import/export. Personal research remains in the browser; no account sync is claimed.
- Approved NBA imagery, team marks, cinematic homepage, liquid VS interaction, responsive
  navigation, keyboard access, chart tables and system/in-app reduced motion.
- Homepage finish: stronger original logo tilt, wider feathered Wembanyama photograph,
  genuinely transparent hero search with a solid results surface.

Release preparation updates documentation and adds an opt-in local production smoke tool.
It preserves the approved application implementation, assets and development history.

Technical checks, current live-provider results and limits are in [release readiness](RELEASE_READINESS.md).
Public deployment remains subject to [rights review](RIGHTS_REVIEW_3.3.md) and
[the deployment runbook](DEPLOYMENT_RUNBOOK.md).

**MERGE METHOD: SQUASH AND MERGE ONLY. This entire release must enter main as one new commit.**

Suggested squash title: `feat: release NBA Performance Explorer 3.3`

Suggested squash description:

> Release the completed NBA player analytics and historical research application, including
> league/team/game archives, scoreboard, comparisons, research tools, saved work, approved
> imagery, responsive navigation and accessible motion. Include the 3.3 release audit,
> provenance review, production checks and deployment/rollback instructions. Preserve
> explicit source labels and production safeguards against fixture substitution.
