# AGENTS.md — Working agreement for coding agents

This file defines how every coding agent (and human) works in this repository. It applies
to all agents regardless of model or tool. Read it fully before doing anything.

## Required reading before any work

Before writing or editing any code, read these, in order:

1. `docs/PROJECT_SPEC.md` — what we are building and what "done" means.
2. `docs/ARCHITECTURE.md` — the boundaries and rules you must not violate.
3. `docs/PROJECT_STATE.md` — the current milestone, task, status, and next action.
4. **The active task file** in `docs/tasks/` (for example
   `docs/tasks/TASK-001-project-foundation.md`).

If any of these conflict, stop and raise the contradiction rather than guessing.

## Before editing

- **Inspect existing code and git status first.** Run `git status` and review the current
  state of the files you intend to touch before making changes. Understand what is already
  there.
- Confirm which task is active in `docs/PROJECT_STATE.md` and work only on that task.

## Scope discipline

- **Stay within the active task.** Do only what the active task file describes.
- **Do not do unrelated refactoring.** If you spot something worth changing that is outside
  the task, note it (in the task file or `docs/DECISIONS.md`) instead of changing it now.
- **Do not add dependencies without justification.** Prefer the approved stack. If a new
  dependency is genuinely needed, justify it and record it as a decision in
  `docs/DECISIONS.md` before relying on it.

## Code standards

- **TypeScript strict mode is required.** It must stay enabled.
- **Avoid `any`.** Do not use `any` unless it is unavoidable, and when it is, document why
  inline and keep it as narrow as possible.
- **Never expose secrets.** API credentials and secrets must never appear in frontend code,
  in the bundle, or anywhere in the committed repository. Use environment variables and the
  backend (see ARCHITECTURE.md and ADR-003).
- Respect the architecture boundaries: the frontend talks only to our own backend; React
  components consume internal domain models, never raw external API responses; the data
  provider is replaceable.

## Verification — do not skip

Where applicable to the change, run and confirm:

- Formatting.
- Linting.
- Type checking (strict).
- Tests.
- Production build.

Then:

- **Review the complete git diff** before considering the work finished.
- **Never claim something passed unless it was actually run and verified.** Do not say
  "tests pass" or "the build succeeds" unless you executed it and saw it succeed. If you
  could not run something, say so explicitly.

## After completing a task

- **Update `docs/PROJECT_STATE.md`** to reflect the new milestone/task/status and the next
  action. Keep it honest — do not list features that are not actually implemented.
- **Record major decisions in `docs/DECISIONS.md`** as new ADR entries (do not rewrite
  existing ones; supersede when needed).

## Source control

- **Never commit or push unless explicitly instructed to.** Leave changes staged/unstaged
  for review by default. Do not create commits, tags, or push to any remote on your own
  initiative.
- When you are instructed to commit, only then create a commit; never push unless that is
  also explicitly requested.

## Honesty

Be accurate about what was done and what was verified. If something is incomplete,
untested, or uncertain, state it plainly. Accuracy is more important than appearing finished.
