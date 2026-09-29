# Working with the harness

## Start here

Requires Node 24 and Git; this harness has no npm dependencies or provider calls.
Run `node scripts/harness/cli.mjs install` once per checkout, then restart Command
Code so it loads the project hooks. Run `doctor` and read AGENTS.md plus the handoff.
The application scripts do not exist until FOUNDATION creates them. A fresh
Codex or Command Code session starts from docs/session-workflow.md.

```sh
node scripts/harness/cli.mjs doctor
node scripts/harness/cli.mjs task start FOUNDATION
# Execute docs/prompts/01-platform-foundation.md, with its bounded scope.
node scripts/harness/cli.mjs check
node scripts/harness/cli.mjs verify FOUNDATION
node scripts/harness/cli.mjs task finish FOUNDATION .harness/runs/REPORT.json
```

Replace REPORT with the report printed by verify. Before verification, create
`docs/reviews/FOUNDATION.json` with a `checks` array containing each manual criterion
listed in docs/tasks.json. Entries require `criterion`, `status: "pass"`, and an
`evidence` string naming actual commands/results, browser observations or remote
run/URL evidence. Never mark unavailable CI/deployment evidence passed. Review
files are included in the source fingerprint, so changing one requires rerunning
verification. An agent-written review is an explicit attestation, not independently
trusted proof of a remote system.

Use `task status ID "implemented but unverified"` or `task status ID blocked`
when needed. Describe why and the exact next action in the handoff. The status
command cannot bypass the finish gate to set verified complete.

## What executes automatically

- SessionStart injects current task and source-of-truth paths. It does not read
  secrets or dump whole transcripts into model context.
- PreToolUse denies direct read/write/edit of raw secret files and direct log
  mutations. Placeholder environment examples are allowed. Shell commands and
  arbitrary external tools are not sandboxed by this path guard.
- Stop captures completed prompt/response records first, then reports task status
  or stale verification. Progress updates are allowed without rerunning the suite.
  A capture failure requests one revision; repeated failure is reported visibly.
- Git pre-commit checks policy, historical log prefixes and obvious credentials.
  Commit-msg rejects co-author lines. Local hooks can be bypassed with Git flags;
  CI repeats repository/commit policy and must be required in branch protection.
- CI executes harness regression tests and policy checks against the PR/push base.
  Application CI is added by FOUNDATION. Remote GitHub execution is not proven by
  a workflow file or a local run.

## Verification evidence

`verify ID` runs the configured command arrays without a shell, records exit codes,
errors/timeouts, durations, source fingerprint and commit in .harness/runs. It stops
at the first failure. Raw child output is not persisted in evidence to reduce the
risk of copying secrets; rerun the failed command locally for detailed diagnostics.
Verification fails if source changes during the checks. `finish` requires the same
source, same task/phase, all checks and the required manual review. It copies the
result into docs/evidence and changes the task status. Policy checks also require
completed tasks to retain their verification report and matching manual review.
These hashes detect accidental changes; repository writers are not an independent
trust boundary.

Historical logs, generated run/evidence records, task status, the handoff and Command Code taste preferences are
excluded from fingerprints because they change independently of verified source. Source,
tests, harness configuration, acceptance documents and manual reviews are included.
An unfinished application checkpoint can pass repository policy without all
application scripts; its task cannot be verified until they exist and run.
After an application task is verified, policy checks require those scripts.
An application task cannot use harness-only evidence. The runner executes all
required real pnpm scripts for application tasks; it cannot establish that a
maliciously weakened test suite is meaningful. Review protects that boundary.

## Capture integrity

The updated writer appends records using a per-session lock and record IDs. It
never refreshes an old header or writes existing log bytes. Existing legacy totals
remain historical metadata; new records carry append-only identifiers. First use
on an existing legacy session appends a migration marker so duplicate suppression
can recover without mutable state. A short/unavailable legacy branch fails visibly
rather than guessing. Broken/truncated transcripts are not presented as captured.

If a writer is killed, an empty per-session `.lock` directory can remain under
.commandcode/.capture-state. Confirm no capture writer is running before removing
only that lock directory. Never repair capture by editing .agent-logs. The older
CAPTURE-TEST.md describes the previous implementation and remains historical.

Regression tests run in disposable directories outside this repository. They cover
exact append preservation, repeated stops, state loss, resumed/branched sessions,
concurrency, policy rejection, configuration gates and stale evidence. Two live Codex sessions and their raw entries in CAPTURE-TEST.md verify Codex
hook wiring. Command Code requires its own live canary when used again; fixture
tests alone do not establish that tool's current integration.

## Practical boundaries

This is a workflow harness, not an adversarial OS sandbox or a guarantee against
all secrets. Heuristic credential checks are intentionally supplementary. Keep
permissions and secrets managed by the host and the approved service accounts.
Do not disable guards to obtain a passing result; diagnose false positives and
change policy only within explicit user authorization. Keep documents small and
add executable checks as real application behavior becomes available.

Command Code protocol reference: https://commandcode.ai/docs/hooks
