# Release metadata and historical attribution review

17 October 2026. Scope: current public release documents, README, handoff, workflows,
package/page metadata, tracked acknowledgements, Git configuration, hooks and reachable
history before release-preparation commits. This review does not change contributor history.

## Current release materials

No optional assistant badges, promotional credits, generated release signatures or
assistant acknowledgements were found in the new release documents or public README.
The README checkout instructions and current release/deployment references now use
`release/nba-performance-explorer-3.3`. The PR title is
`feat: release NBA Performance Explorer 3.3`; its description concerns the application,
validation, rights, deployment and rollback. The suggested squash description in the
release notes has no promotional signature or co-author trailer.

Historical branch names, tool-specific handoffs, verification paths and source provenance
remain where replacing them would make records inaccurate. References to image upscaling
describe provenance and do not establish permission. Wikipedia contributor credits,
source revisions, dataset licences, font notices and human attribution remain intact.

## Git identity and historical findings

- Configured author and committer: `lorenzodarioben-lgtm <lorenzodarioben@gmail.com>`,
  from the existing user Git configuration. No identity override was introduced.
- No configured commit template or custom hooks path; the shared repository hook directory
  contains sample hooks only, with no active attribution-appending hook.
- Across all reachable local refs at the audit baseline: 236 commits, including 20 authored
  and committed by `Claude <noreply@anthropic.com>`. The other 216 have the configured human
  author; GitHub is also a historical committer for web-created commits.
- Historical bodies contain 50 co-author trailers: 30 naming Claude Opus 4.8 and 20 naming
  Claude Opus 5.5, all using `noreply@anthropic.com`. The 30 older trailers are already in
  main's history; the 20 newer trailers are in the 132-commit development range.
- Twenty historical bodies also contain `Claude-Session` links. No historical commit,
  author, committer, trailer or session link was rewritten or deleted.
- GitHub's contributors endpoint reported the owner account only (104 contributions on
  the default branch at inspection). This does not erase the historical metadata above,
  and the UI's future attribution cannot be guaranteed by this audit.

New release commits use the configured identity with no co-author or promotional footer.
The neutral release snapshot parents main and preserves the verified development tree;
the original branch retains its full ancestry. No assistant account is deliberately added.
The snapshot does not copy historical commit-message trailers into its new message.

## Verification and eventual merge

Inspect both new commit objects with `git show -s --format=fuller <commit>` and their full
bodies for trailers before publication. Compare the full tree IDs of the development and
release tips, and confirm `git rev-list --count main..release/nba-performance-explorer-3.3`
is one while main remains at its audit-start SHA. Release delivery records those SHA values.

Only the owner may approve the eventual **Squash and merge**, producing exactly one new
main commit. Review GitHub's generated squash body again at that time, preserving legitimate
attribution and using the exact title/body in the release notes. Preparation commits carry
a Render deploy-skip marker; omit that marker from the future approved production commit.
