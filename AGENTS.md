# Repository rules

- Git commit messages must NOT include a `Co-authored-by` trailer or any co-author
  line. This applies to every commit in this repo, regardless of which tool or agent
  creates it.
- `.agent-logs/` is part of the submission: never gitignore it, never edit, tidy,
  summarise, or delete existing log entries after the fact. Commit logs interleaved
  with the code they produced.

## Capture before assignment work

Codex capture is configured in `.codex/hooks.json`; Command Code uses its own
`.commandcode/settings.json`. Neither tool's hooks prove capture for the other.
Before assignment implementation, require two real sessions with recorded canary
prompts and final responses, documented in `CAPTURE-TEST.md`. See
`docs/codex-capture.md` for Codex activation, recovery and the current evidence gap.
A prompt beginning `CAPTURE TEST — 8x assignment,` is only a capture canary:
reply `CAPTURE TEST RECEIVED` without tools, task transitions or code edits.
Never treat fixture tests or a manual transcript import as proof that automatic
hooks ran. Preserve the actual tool/model names when changing agents. Capture only
human prompts and final responses; never publish reasoning, tool output or progress
updates. If capture is unverified or fails, finish capture setup before other work.

## Start every implementation task

Read `docs/handoff.md`, `docs/tasks.json`, `docs/scope.md`, and `docs/architecture.md`.
Inspect Git status and relevant code before editing. Preserve unrelated work.
Run `node scripts/harness/cli.mjs doctor`, then start the applicable task with
`node scripts/harness/cli.mjs task start TASK_ID`. Respect dependency gates.
One active implementation task and one coding agent by default; no delegation
unless the user explicitly requests it. The complete harness contract is in
`docs/harness.md`; the task format is in `docs/task-template.md`. For fresh
Codex or Command Code sessions, follow `docs/session-workflow.md`.

## Authority and scope

Routine implementation, tests, fixes, and documentation within approved scope
are delegated. Product scope, architecture changes, new external services,
paid resources, live payments, destructive operations, and public publication
need authorization unless already approved in the conversation.
Carry approvals forward. Do independent local work while external access is
missing. Never invent credentials, deployments, measurements, or test outcomes.
Do not expose secrets through tool output, prompts, telemetry, fixtures or commits.
Use injected credentials; commit only placeholder environment examples.

## Engineering boundaries

Use Next.js, NestJS, Drizzle/PostgreSQL, DTO validation and native fetch as specified
in the architecture. No direct Prisma/Zod/Axios dependencies. Domain rules stay
independent of HTTP and persistence. Cross-module calls use public capabilities;
never reach into another module's repositories. Frontend never imports backend
runtime or database code. Only implement layers justified by current behavior.
Server owns authorization, prices, stock and payment state. Never retry billable
or non-idempotent work automatically. Existing historical logs are immutable even
when incorrect; document future corrections separately without rewriting them.

## Commands available now

- `node scripts/harness/cli.mjs doctor` — inspect capabilities, without secrets.
- `node scripts/harness/cli.mjs install` — install versioned local Git hooks.
- `node scripts/harness/cli.mjs check` — repository/log/dependency policy checks.
- `node --test scripts/harness/tests.test.mjs` — isolated harness regression tests.
- `node scripts/harness/cli.mjs verify TASK_ID` — execute required checks and record evidence.
- `node scripts/harness/cli.mjs task finish TASK_ID .harness/runs/REPORT.json` —
  require fresh passing evidence plus the task's documented manual review.

The application does not exist yet. Do not claim its checks pass. FOUNDATION must
supply real `pnpm format:check`, `lint`, `typecheck`, `contracts:check`, `test`,
`test:integration`, `test:e2e`, and `build` scripts. The harness rejects application
verification until those scripts exist, and executes them before completion.
Unverified partial checkpoints may be committed with truthful task status.
Do not weaken checks, replace them with echo stubs, skip failed tests, or silently
remove acceptance criteria. Use mocks only where documented, never as evidence
that a real external integration works.

## Completion and handoff

Inspect the diff, run meaningful checks, and record manual evidence in
`docs/reviews/TASK_ID.json` before `verify`. The runner ties evidence to source
content; changes after verification require a new run. Evidence excludes mutable
task/handoff metadata and append-only logs, not implementation/specification files.
Update `docs/handoff.md` with actual state, commands/results and the next task.
Use explicit statuses: planned, in progress, blocked, implemented but unverified,
verified complete. Only the finish command promotes a task to verified complete.
A progress update may stop with work unverified; never disguise it as completion.

Commit bounded verified work and its relevant logs; inspect the staged diff.
Do not automatically push or deploy without the existing session authorization.
After two failures on the same approach or 20 minutes without progress, reassess.
Preserve the 20-hour assignment window and five-hour final verification reserve.
Comments explain non-obvious decisions; no AI narration, filler, or unsupported
claims about reliability, security, scale, or production readiness.
