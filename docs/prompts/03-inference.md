# Goodform implementation prompt 03: funded inference feasibility

## Start

Read `AGENTS.md`, `docs/handoff.md`, `docs/session-workflow.md`, `docs/tasks.json`,
`docs/scope.md`, `docs/architecture.md` and `docs/decisions.md`. Inspect Git status
and the existing `identity`, `carts`, `inventory`, `orders` and `payments` modules
before editing. `INFERENCE` depends on `FOUNDATION` only, so the unverified
`DELIVERY` and `COMMERCE` states do not block it. Preserve unrelated work.

The task is already started with `node scripts/harness/cli.mjs task start INFERENCE`.

Do not write or run automated tests. `pnpm test`, `pnpm test:integration` and
`pnpm test:e2e` stay off until the user asks. Do not run harness `verify` or
`task finish`; the application verification gate hard-codes those scripts.

## Outcome

Prove or disprove that the Google-credit-funded photo try-on path is actually
reachable, funded, fast enough, good enough, and has retention terms that can be
disclosed truthfully to users. Write the result down with real observed evidence.

A negative, evidenced result is a successful outcome for this task. The point of
S5 is that this feature must not be called working until the gate passes.

This is a feasibility gate, not the fitting room. `FITTING_ROOM` owns photos,
generation jobs, budgets, comparison and measurements.

## Blocker to surface first

Decision `D04` records that Google try-on API access and funding eligibility are
unverified. Establish before writing adapter code whether the account, project,
enabled API, region and credentials actually exist in this environment.

If they do not, say precisely what is missing and what a human must do to supply
it, then complete every non-billable part of this task anyway. Do not invent
quota, latency, quality, retention, or cost figures, and do not substitute mocks
or fixture responses for a real provider call and call the gate passed.

## Budget gate before any billable call

Six try-on generations are billable and the user said no uncovered spending.
Before the first call, state the expected per-call cost and the worst-case total,
and get explicit approval. Stop immediately on any unexpected charge, quota
exhaustion, or billing error. Never automatically retry a billable call.

## Model selection must be verified, not recalled

Confirm the current try-on-capable Google model, its exact request shape, region,
endpoint, and general-availability status from official vendor documentation before
coding. Do not write the adapter from memory, and do not use a recalled model ID.

If Google's dedicated virtual try-on capability is not enabled on the account, or
is preview-only, or is unavailable in the account's region, that is the finding.
Record it and stop billable work.

## Bounded implementation

Only build what the gate needs. A small, correct probe is enough.

- An `inference` module owning configuration validation, the provider adapter, and
  a bounded probe. Follow the module layout of the existing commerce modules.
- Config: Google project, credentials reference, region, model ID, per-call cost
  ceiling, and a daily call cap. Validate with class-validator, disable implicit
  conversion, and fail fast on missing values without printing them. Enable
  provider validation only when the integration is enabled.
- Adapter: official vendor SDK only. Check the provider response shape at the
  adapter boundary. Use a bounded timeout and `AbortSignal`. No automatic retry on
  a billable or non-idempotent call.
- Probe entry point: something like `pnpm inference:probe`. It records model ID,
  start and end timestamps, latency, provider status, estimated cost, and the
  safe request ID.
- Logging: allowlist safe fields only. Never log photo paths, prompt or image
  bytes, base64 payloads, signed URLs, or credential material. Redaction must
  already apply before stdout and before Observe export.

## Feasibility thresholds

Propose the thresholds in writing before running anything, then apply them as
written. Do not move the goalposts after seeing results. A reasonable starting
shape, subject to correction before the run:

- Latency: median of the six runs at or under 30 seconds, and record the worst.
- Reliability: at least five of six complete without a provider error.
- Quality: all six artifacts are human-reviewed, and any anatomically implausible
  result fails the gate outright.
- Retention: the vendor's terms for inputs and outputs, including whether they
  train models and how long they are kept. Unknown or undisclosed is a fail.
- Credits: confirm the remaining credit and that the run fits inside it.

## The six try-on observations

One garment and one permitted model photo, six separate generations. For every
run record: started and ended, latency, provider status, whether a human reviewed
the artifact, defect notes, estimated cost, and the request ID.

S5 requires up to two previews from the same original, so also confirm that two
usable previews can be produced from one source image rather than requiring a
fresh upload per preview.

## Evidence and documents

Record in `docs/reviews/INFERENCE.json` the task's manual checks
`provider-credit-coverage` and `six-tryon-observations`, each with an explicit
status and the evidence actually observed. Add a feasibility summary recording the
pass or fail verdict and which threshold decided it. A criterion may only be
`pass` when a real observation supports it; otherwise use `pending` or `fail` and
state the blocker.

Write `docs/inference.md` covering the verified model and region, the cost model,
the retention disclosure that FITTING_ROOM will reuse, the per-observation table,
the gate verdict, and the consequences for FITTING_ROOM.

Update `docs/handoff.md` with the real state and the next action. Update
`docs/decisions.md` if the provider, model, or region decision changes.

## Static checks

Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, contract generation and
`pnpm contracts:check`, and `pnpm build`. Do not add, modify, or skip test files.
Do not weaken an existing check.

## Stop conditions

- Missing credentials, unclear funding, or unverifiable eligibility: finish the
  non-billable work, record precise blockers, and leave the task implemented but
  unverified.
- Any unexpected charge, quota exhaustion, or billing error: stop immediately and
  report.
- The provider requires access or region the account does not have: record the
  finding and stop.
- Two failed attempts at the same approach, or twenty minutes without progress:
  reassess per `docs/session-workflow.md`.

## Commit

Commit bounded work in logical phases, staging only files belonging to this task.
Do not stage the pre-existing unstaged edits to
`.agent-logs/2026-09-29_01-08-48_01a0eab5-0cd5-7d33-a8f9-b0dec051cd27.md` or
`.commandcode/taste/taste/taste.md`. No co-author lines. Do not push, and do not
provision any billable resource.
