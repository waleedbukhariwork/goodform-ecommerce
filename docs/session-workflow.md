# Session workflow and time budget

The repo is the durable memory. Start a new Codex chat for a bounded milestone,
not a single giant prompt covering the whole store. A chat may end before its task
ends. Handoff through committed code, `docs/tasks.json`, `docs/handoff.md`, and
verification evidence. Do not paste old transcripts or all application files into
a new chat. The client receives raw prompts and finals through `.agent-logs/`.

## Start a fresh Codex session

Open this repository as the workspace, then send:

> Read AGENTS.md, docs/handoff.md, docs/tasks.json, docs/scope.md,
> docs/architecture.md, and docs/session-workflow.md. Run
> `node scripts/harness/cli.mjs doctor` and inspect Git status. Continue only the
> next eligible task from its prompt file. State the acceptance checks and any
> blocking prerequisite before editing. Keep prior approvals and untouched files.

The next eligible task is in `docs/handoff.md`. For `FOUNDATION`, read
`docs/prompts/01-platform-foundation.md`; for `DELIVERY`, read
`docs/prompts/02-delivery.md`. Later tasks use the acceptance criteria in
`docs/scope.md`, the tracker and `docs/task-template.md`. Give each later task a
bounded prompt before starting it; do not ask one session to build the entire app.

The trusted Codex capture hooks run automatically. Check that the current
session creates a new `.agent-logs/` file with a prompt and, once finished, a
final response. When the capture definition, tool or model changes, run a fresh
canary and append the actual evidence to `CAPTURE-TEST.md`. No per-turn canary is
needed with unchanged verified hooks. Keep new logs with the commit they explain.

## If returning to Command Code

Use Command Code only when its model quota is available. A fresh `cmd` session in
this repository loads `.commandcode/settings.json`; confirm its capture with a
new short canary after a tool/hook change. Use the same source documents and task
tracker. Do not copy raw conversations between tools: handoff files and commits
carry decisions; logs retain the full history. Never claim Codex's hook test
verified Command Code or the reverse.

## End a work slice

1. Run task-specific checks, inspect the diff and record actual results. Use
   `node scripts/harness/cli.mjs verify TASK_ID`; `task finish` only if the
   required manual review and current evidence pass. Otherwise use
   `task status TASK_ID "implemented but unverified"` or `blocked` truthfully.
2. Update `docs/handoff.md` with: task/status, working behavior, exact commands
   and outcomes, evidence paths, commit, dependencies/blockers, measured time
   remaining if known, and one concrete next action.
3. Commit bounded changes with relevant new logs. Exclude unrelated working-tree
   changes. No co-author lines. The current chat's final response may land in
   its log after the commit; include that append in the next bounded commit.
4. Start a new chat when context becomes crowded. Read the handoff rather than
   replaying the full chat. If an unfinished task continues, call `task start ID`
   again after inspecting status, then proceed from recorded evidence.

Do not erase failed attempts or force a task to complete for a clean handoff.
Git hooks and CI provide guardrails; remote deployment and paid-provider proof
require actual runs and recorded results.

## Time allocation

The user's starting envelope was 20 hours, including a five-hour final verification
reserve. Elapsed time has not been measured in this repo, so these are ceilings
for planning, not a claim that 20 hours remain:

| Slice | Target | Exit condition |
| --- | ---: | --- |
| Foundation catalog | 3h | Local web/API/DB slice and checks |
| Delivery systems | 2h | Containers, environments, tracing, CI/release path; remote claims only with runs |
| Inference feasibility | 1h | Funded access, retention and sample quality evidence |
| Commerce | 3h | Account, cart, Stripe test and ownership journey |
| Fitting room | 4h | Private generation, comparison, measurement and recovery |
| Integration contingency | 2h | Fix actual cross-slice failures; cut polish before safety checks |
| Final verification and submission | 5h reserved | Full journeys, restore, deployment regression, evidence |

Recalculate from the real clock before starting each slice. If less time remains,
prioritize a truthful, demonstrable end-to-end path and report unmet criteria.
Never spend the final reserve on an unverified new feature or call a mock external
integration working.
