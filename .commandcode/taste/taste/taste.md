# Taste
- Prefers automation that fires on its own (tool hooks / lifecycle events) over anything that must be remembered and run manually; expects the agent to actually research a tool's capabilities before answering, not guess or fall back to a manual workaround. Confidence: 0.75
- Expects verification before building: prove a mechanism works first (canary test, second fresh session to show it isn't session-local, written test report) before starting real work. Confidence: 0.7
- Values honest, unedited records over tidy ones — keep dead ends, wrong turns, failed attempts, and full verbatim prompts/responses; no post-hoc summarising, cleanup, or deletion. Confidence: 0.7
- Wants agent transcripts captured to `.agent-logs/` at the repo root and committed alongside the code they produced (never gitignored), with interleaved commits so the real order of work is visible. Confidence: 0.55
- Git commits must never carry a `Co-authored-by` trailer or any other co-author line in the commit message. Confidence: 0.95
- Works in Command Code CLI (`cmd`) on Linux; project-level agent config lives under `.commandcode/` (`settings.json` hooks, `hooks/` scripts), and headless `cmd -p "..."` is used to spin up fresh sessions for testing. Confidence: 0.6
