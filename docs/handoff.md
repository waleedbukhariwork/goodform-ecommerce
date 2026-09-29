# Current handoff

- HARNESS: verified complete. Evidence:
  `docs/evidence/HARNESS-9664d55c-9d5c-4515-87a9-9eb059bb62a3.json` and
  `docs/reviews/HARNESS.json`. The configured verification ran 42 regression
  tests and repository policy; both passed, with unchanged source. Local Git
  hooks are installed. JavaScript, shell and workflow syntax checks passed.
- Capture: trusted Codex hooks and two distinct live canaries passed. Both raw
  prompt/final pairs are appended to `CAPTURE-TEST.md`. CLI parser failures and
  append-only corrections remain visible in separate logs. The updated
  Command Code hook path has fixture tests; run a fresh Command Code canary
  before switching back to it when model quota is available.
- Application: no app scaffold, application tests, remote CI run or deployment
  have been verified. FOUNDATION is planned and is now the next eligible task.
- Product and stack: `docs/scope.md`, `docs/decisions.md`, `docs/architecture.md`.
  Fresh-session procedure: `docs/session-workflow.md`. First implementation
  prompt: `docs/prompts/01-platform-foundation.md`. Delivery follows from
  `docs/prompts/02-delivery.md` after a verified foundation.
- External gates still need real evidence: AWS resources/credit coverage, DNS,
  Google inference access/retention/credit coverage, Observe account, GitHub
  CI permissions and deployment. Do not print credentials or claim a remote
  result from local files.
- Time remaining is not measured here. Record the actual clock before beginning
  FOUNDATION and preserve five hours for final verification.
- Existing logs are immutable. The current session's final response may append
  after its code commit; include that append in the next bounded commit.

Next action: open a fresh Codex chat in this repository, use the starter prompt in
`docs/session-workflow.md`, run doctor, inspect status, start FOUNDATION and build
only the local catalog slice. Verify with real Postgres and browser evidence, then
hand off. Do not restart the harness or read entire historical logs into context.
